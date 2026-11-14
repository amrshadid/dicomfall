import type { StringRule } from '@dicomfall/core/types'
import { describeType, type Issues, isRecord, joinPath, ObjectReader, reportDuplicates } from '@dicomfall/core/utils'
import type { CheckDefinition } from '#types/definitions/checks'
import { type LabAe, type LabDefinition, type LabFile, type LabLink, MAX_AE_TITLE } from '#types/definitions/lab'
import { KEBAB_ID, type ObjectiveDefinition } from '#types/definitions/mission'
import { LAB_DESTINATION } from '#utils/validate/check.schema'

const LAB_KEYS = ['aes', 'links', 'files', 'console'] as const

const AE_KEYS = ['name', 'title', 'address', 'start'] as const

// PS3.5 §6.2, VR AE: the Default Character Repertoire without the backslash or any control
// character, 16 characters at most, and never spaces alone.
const AE_TITLE: StringRule = {
  pattern: new RegExp(`^(?=.*[^ ])[\\x20-\\x5B\\x5D-\\x7E]{1,${MAX_AE_TITLE}}$`),
  expected: `an AE title of 1 to ${MAX_AE_TITLE} characters, with no backslash or control character, like WORKSTATION`,
}

const OCTET = '(?:25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])'

const IPV4_WITH_PREFIX: StringRule = {
  pattern: new RegExp(`^${OCTET}(?:\\.${OCTET}){3}\\/(?:3[0-2]|[12][0-9]|[1-9])$`),
  expected: 'an IPv4 address with its prefix length like 10.0.1.1/24',
}

const START_COMMAND: StringRule = { pattern: /^go-dicom [^\n\0]+$/, expected: 'one go-dicom command on one line' }

// A fixture's path in `packages/fixtures/out/`: relative, with no `.` or `..` part, a folder ending in `/`.
const FIXTURE_SEGMENT = String.raw`(?!\.{1,2}(?:\/|$))[A-Za-z0-9_.+-]+`

const FIXTURE: StringRule = {
  pattern: new RegExp(`^${FIXTURE_SEGMENT}(?:\\/${FIXTURE_SEGMENT})*\\/?$`),
  expected: 'a path in packages/fixtures/out/ like ct-explicit-le.dcm, or a folder like series/',
}

const isFolder = (path: string): boolean => path.endsWith('/')

/** The address as a 32-bit number and its network, to tell whether two ends of a link can reach each other. */
function networkOf(address: string | undefined): { readonly network: number; readonly prefix: number } | undefined {
  if (address === undefined || !IPV4_WITH_PREFIX.pattern.test(address)) {
    return undefined
  }
  const [ip = '', prefixText = '0'] = address.split('/')
  const prefix = Number(prefixText)
  const value = ip.split('.').reduce((sum, octet) => sum * 256 + Number(octet), 0)
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0
  return { network: (value & mask) >>> 0, prefix }
}

function readAe(ae: ObjectReader): LabAe {
  ae.rejectUnknownKeys(AE_KEYS)
  const name = ae.string('name', KEBAB_ID)
  const title = ae.string('title', AE_TITLE)
  const address = ae.optional('address', (key) => ae.string(key, IPV4_WITH_PREFIX))
  const start = ae.has('start') ? ae.stringList('start', START_COMMAND) : []
  return { name, title, ...(address !== undefined && { address }), start }
}

function readLink(value: unknown, path: string, issues: Issues): LabLink {
  if (!Array.isArray(value) || value.length !== 2) {
    issues.add(path, `expected a pair of AE names like [workstation, archive], got ${describeType(value)}`)
    return ['', '']
  }
  const names = value.map((name: unknown, at) => {
    if (typeof name !== 'string' || !KEBAB_ID.pattern.test(name)) {
      issues.add(joinPath(path, at), `expected an AE name like workstation, got ${JSON.stringify(name)}`)
      return ''
    }
    return name
  })
  return [names[0] ?? '', names[1] ?? '']
}

function readFile(file: ObjectReader): LabFile {
  file.rejectUnknownKeys(['fixture', 'to'])
  const fixture = file.string('fixture', FIXTURE)
  const to = file.string('to', LAB_DESTINATION)
  if (fixture !== '' && to !== '' && isFolder(fixture) !== isFolder(to)) {
    file.issues.add(
      file.pathOf('to'),
      'a folder fixture lands in a folder, a file in a file: end both in "/" or neither'
    )
  }
  return { fixture, to }
}

/** Links join two different AEs of the lab, once each; both ends have an address on one network. */
function reportLinks(lab: ObjectReader, aes: readonly LabAe[], links: readonly LabLink[]): void {
  const byName = new Map(aes.map((ae): [string, LabAe] => [ae.name, ae]))
  const seen = new Set<string>()
  links.forEach(([first, second], at) => {
    const path = joinPath(lab.pathOf('links'), at)
    if (first === '' || second === '') {
      return
    }
    for (const name of [first, second].filter((end) => !byName.has(end))) {
      lab.issues.add(path, `no AE "${name}" in lab.aes`)
    }
    if (first === second) {
      lab.issues.add(path, `a link joins two AEs, not "${first}" to itself`)
    }
    const key = [first, second].sort().join(' ')
    if (seen.has(key)) {
      lab.issues.add(path, `"${first}" and "${second}" are already linked`)
    }
    seen.add(key)
    const one = networkOf(byName.get(first)?.address)
    const other = networkOf(byName.get(second)?.address)
    if (one && other && (one.prefix !== other.prefix || one.network !== other.network)) {
      lab.issues.add(path, `"${first}" and "${second}" are on different networks: a veth pair joins one`)
    }
  })
  const linked = new Set(links.flat())
  aes.forEach((ae, at) => {
    const path = joinPath(lab.pathOf('aes'), at)
    if (linked.has(ae.name) && ae.address === undefined) {
      lab.issues.add(joinPath(path, 'address'), `"${ae.name}" is linked, so it needs an address`)
    } else if (!linked.has(ae.name) && ae.address !== undefined) {
      lab.issues.add(joinPath(path, 'address'), `"${ae.name}" has no link: leave its address out`)
    }
  })
}

/** Each file lands in its own place: two fixtures never share a destination or nest in one another's folder. */
function reportFiles(lab: ObjectReader, files: readonly LabFile[]): void {
  const bare = (path: string) => path.replace(/\/$/, '')
  const overlap = (one: string, other: string) =>
    bare(one) === bare(other) || (isFolder(one) && other.startsWith(one)) || (isFolder(other) && one.startsWith(other))
  files.forEach((file, at) => {
    const clash = files
      .slice(0, at)
      .find((earlier) => earlier.to !== '' && file.to !== '' && overlap(earlier.to, file.to))
    if (clash !== undefined) {
      lab.issues.add(joinPath(joinPath(lab.pathOf('files'), at), 'to'), `"${file.to}" overlaps "${clash.to}"`)
    }
  })
}

/**
 * Reads a mission's `lab:` block: its AEs with their titles and addresses, the links between them,
 * the fixtures copied into `/lab/`, and the AE the console opens in.
 */
export function readLab(value: unknown, path: string, issues: Issues): LabDefinition {
  const lab = new ObjectReader(value, path, issues)
  // With no lab at all, listing each field it lacks would only repeat that.
  if (!isRecord(value)) {
    return { aes: [], links: [], files: [], console: '' }
  }
  lab.rejectUnknownKeys(LAB_KEYS)
  const problemsSoFar = issues.count
  const aes = lab.list('aes', (entry, at) => readAe(new ObjectReader(entry, at, issues)))
  const aesRead = issues.count === problemsSoFar
  const links = lab.has('links') ? lab.list('links', (entry, at) => readLink(entry, at, issues)) : []
  const files = lab.has('files') ? lab.list('files', (entry, at) => readFile(new ObjectReader(entry, at, issues))) : []
  const opensIn = lab.string('console', KEBAB_ID)
  if (Array.isArray(lab.value('aes')) && aes.length === 0) {
    lab.issues.add(lab.pathOf('aes'), 'expected at least one AE: the console opens in one')
  }
  reportDuplicates(
    aes.map((ae) => ae.name),
    lab.pathOf('aes'),
    lab.issues
  )
  reportDuplicates(
    aes.map((ae) => ae.title),
    lab.pathOf('aes'),
    lab.issues
  )
  reportDuplicates(
    aes.flatMap((ae) => (ae.address === undefined ? [] : [ae.address.split('/')[0] ?? ''])),
    lab.pathOf('aes'),
    lab.issues
  )
  reportFiles(lab, files)
  // Names checked against AEs that are missing or misread would only repeat that problem.
  if (aes.length === 0 || !aesRead) {
    return { aes, links, files, console: opensIn }
  }
  reportLinks(lab, aes, links)
  if (opensIn !== '' && !aes.some((ae) => ae.name === opensIn)) {
    lab.issues.add(lab.pathOf('console'), `no AE "${opensIn}" in lab.aes`)
  }
  return { aes, links, files, console: opensIn }
}

/** The lab paths a check reads, each with the field that names it. */
function filesOf(check: CheckDefinition): readonly (readonly [string, string])[] {
  switch (check.kind) {
    case 'selected':
      return 'file' in check ? [['file', check.file]] : []
    case 'answer':
    case 'offset':
    case 'absent':
      return [['file', check.file]]
    case 'grouped':
      return check.files.map((file, at) => [`files[${at}]`, file])
    case 'file':
      return [
        ['file', check.file],
        ...Object.entries(check.attributes ?? {}).flatMap(([tag, value]): (readonly [string, string])[] =>
          typeof value === 'string' ? [] : [[`attributes.${tag}.sameAs.file`, value.sameAs.file]]
        ),
      ]
    default:
      return []
  }
}

/** The AEs a check names, each with its field. */
function aesOf(check: CheckDefinition): readonly (readonly [string, string])[] {
  switch (check.kind) {
    case 'received':
      return [['ae', check.ae]]
    case 'echo':
      return [
        ['from', check.from],
        ['to', check.to],
      ]
    default:
      return []
  }
}

/** Checks that read the event log or tcpdump: nothing crosses a wire in a lab with no link. */
const readsTheWire = (check: CheckDefinition): boolean =>
  check.kind === 'selected'
    ? 'message' in check
    : !['answer', 'offset', 'grouped', 'file', 'absent'].includes(check.kind)

/**
 * A lab path the mission can name: a file `lab.files` copies, a file under a folder it copies,
 * or a file an AE of the lab receives into its own `/lab/<ae>/received/`.
 */
export function inLab(path: string, lab: LabDefinition): boolean {
  return (
    lab.files.some((file) => file.to === path || (isFolder(file.to) && path.startsWith(file.to))) ||
    lab.aes.some((ae) => path.startsWith(`/lab/${ae.name}/received/`))
  )
}

/** Every file and AE an objective's check names is in the mission's lab, and a wire check has a wire to read. */
export function reportLabUse(objectives: readonly ObjectiveDefinition[], lab: LabDefinition, issues: Issues): void {
  const aes = new Set(lab.aes.map((ae) => ae.name))
  const linked = (first: string, second: string) =>
    lab.links.some(([one, other]) => (one === first && other === second) || (one === second && other === first))
  objectives.forEach((objective, at) => {
    const path = `objectives[${at}].check`
    const { check } = objective
    for (const [field, file] of filesOf(check)) {
      if (!inLab(file, lab)) {
        issues.add(
          joinPath(path, field),
          `"${file}" is not in the lab: expected a file of lab.files, under one of its folders, or under an AE's /lab/<ae>/received/`
        )
      }
    }
    for (const [field, ae] of aesOf(check)) {
      if (!aes.has(ae)) {
        issues.add(joinPath(path, field), `no AE "${ae}" in lab.aes`)
      }
    }
    if (readsTheWire(check) && lab.links.length === 0) {
      issues.add(path, `a ${check.kind} check reads the wire, and the lab has no link`)
    } else if (check.kind === 'echo' && aes.has(check.from) && aes.has(check.to) && !linked(check.from, check.to)) {
      issues.add(path, `no link joins "${check.from}" and "${check.to}"`)
    } else if (check.kind === 'received' && aes.has(check.ae) && !lab.links.some((link) => link.includes(check.ae))) {
      issues.add(joinPath(path, 'ae'), `"${check.ae}" has no link to receive on`)
    }
  })
}
