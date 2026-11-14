import {
  AE_NAME,
  AE_TITLE,
  FIXTURE_PATH,
  FIXTURES_DIR,
  IPV4_WITH_PREFIX,
  LAB_PATH,
  type LabFileDefinition,
  LINK_LOSS_PERCENT,
  type LinkDefinition,
  type NetworkDefinition,
} from '#types/definitions/network'
import { VM_EVENT_TTY } from '#types/definitions/vm'

/** An interface name is 15 characters at most, too short for two AE names: each AE numbers its own, as a host does. */
const INTERFACE_PREFIX = 'eth'

const sameLink = ([first, second]: LinkDefinition, ae: string, peer: string): boolean =>
  (first === ae && second === peer) || (first === peer && second === ae)

/**
 * The interface on `ae` that faces `peer`: `eth0` for the AE's first link in the definition,
 * `eth1` for its second… `null` when the two have no link.
 */
export function interfaceName(network: NetworkDefinition, ae: string, peer: string): string | null {
  const own = network.links.filter((link) => link.includes(ae))
  const at = own.findIndex((link) => sameLink(link, ae, peer))
  return at === -1 ? null : `${INTERFACE_PREFIX}${at}`
}

const addressOf = (network: NetworkDefinition, ae: string): string | undefined =>
  network.aes.find((candidate) => candidate.name === ae)?.address

const hostOf = (address: string): string => address.split('/')[0] ?? address

/**
 * Every problem that would make the setup lines wrong or unsafe to run as root. Names, addresses
 * and paths go into shell lines unquoted, so nothing else may pass.
 */
export function networkProblems(network: NetworkDefinition): string[] {
  const problems: string[] = []
  const names = new Set<string>()
  const hosts = new Set<string>()
  network.aes.forEach((ae, at) => {
    const where = `aes[${at}]`
    if (!AE_NAME.test(ae.name)) {
      problems.push(`${where}.name: expected a kebab-case name of at most 16 characters, got "${ae.name}"`)
    } else if (names.has(ae.name)) {
      problems.push(`${where}.name: "${ae.name}" is used twice`)
    }
    names.add(ae.name)
    if (!AE_TITLE.test(ae.title)) {
      problems.push(`${where}.title: expected 1 to 16 characters with no backslash, got "${ae.title}"`)
    }
    if (ae.address !== undefined) {
      if (!IPV4_WITH_PREFIX.test(ae.address)) {
        problems.push(`${where}.address: expected an address like 10.0.0.1/24, got "${ae.address}"`)
      } else if (hosts.has(hostOf(ae.address))) {
        problems.push(`${where}.address: ${hostOf(ae.address)} is used twice`)
      }
      hosts.add(hostOf(ae.address))
    }
  })
  const pairs = new Set<string>()
  network.links.forEach((link, at) => {
    const where = `links[${at}]`
    link.forEach((ae, side) => {
      if (!names.has(ae)) {
        problems.push(`${where}[${side}]: no AE named "${ae}"`)
      } else if (addressOf(network, ae) === undefined) {
        problems.push(`${where}[${side}]: "${ae}" has a link but no address`)
      }
    })
    const [first, second] = link
    if (first === second) {
      problems.push(`${where}: both ends are on "${first}"`)
    }
    const pair = [first, second].sort().join(' ')
    if (pairs.has(pair)) {
      problems.push(`${where}: "${first}" and "${second}" already have a link`)
    }
    pairs.add(pair)
  })
  ;(network.files ?? []).forEach((file, at) => {
    if (!FIXTURE_PATH.test(file.fixture)) {
      problems.push(`files[${at}].fixture: expected a path under ${FIXTURES_DIR}/, got "${file.fixture}"`)
    }
    if (!LAB_PATH.test(file.to) || file.to.replace(/\/+$/, '') === '/lab') {
      problems.push(`files[${at}].to: expected a path under /lab/, got "${file.to}"`)
    }
  })
  return problems
}

/**
 * A program in an AE: its network namespace, and a hostname of its own, as the AE's own computer
 * would have. Every AE shares the Machine's hostname otherwise.
 */
export const inAe = (ae: string, program: string): string =>
  `ip netns exec ${ae} unshare -u sh -c 'hostname ${ae} && exec ${program}'`

const namespaceLine = (ae: string): string => `ip netns add ${ae} && ip -n ${ae} link set lo up`

/**
 * One veth pair. Each end takes its AE's address without the subnet route, and a route to the far
 * end alone: an AE with links to two others then reaches each over its own cable, even when every
 * AE sits in one subnet, and an AE it has no link to stays out of reach.
 */
function linkLine(network: NetworkDefinition, [first, second]: LinkDefinition): string {
  const near = interfaceName(network, first, second) ?? ''
  const far = interfaceName(network, second, first) ?? ''
  const nearAddress = addressOf(network, first) ?? ''
  const farAddress = addressOf(network, second) ?? ''
  return [
    `ip link add ${near} netns ${first} type veth peer name ${far} netns ${second}`,
    `ip -n ${first} addr add ${nearAddress} dev ${near} noprefixroute`,
    `ip -n ${second} addr add ${farAddress} dev ${far} noprefixroute`,
    `ip -n ${first} link set ${near} up`,
    `ip -n ${second} link set ${far} up`,
    `ip -n ${first} route add ${hostOf(farAddress)} dev ${near} src ${hostOf(nearAddress)}`,
    `ip -n ${second} route add ${hostOf(nearAddress)} dev ${far} src ${hostOf(farAddress)}`,
  ].join(' && ')
}

const withoutTrailingSlash = (path: string): string => path.replace(/\/+$/, '')

/** Copies a fixture, file or folder, to where the mission wants it; the folders above are made first. */
export function labFileLine({ fixture, to }: LabFileDefinition): string {
  const target = withoutTrailingSlash(to)
  const parent = target.slice(0, target.lastIndexOf('/'))
  return `mkdir -p ${parent} && cp -a ${FIXTURES_DIR}/${withoutTrailingSlash(fixture)} ${target}`
}

/**
 * Root's lines that build the network on a clean Machine, in order: the empty `/lab` (the image
 * keeps its fixtures elsewhere, so a lab with no files still has the folder to list), namespaces,
 * cables, then the lab's files. Check `networkProblems` first.
 */
export function networkSetupLines(network: NetworkDefinition): string[] {
  return [
    'mkdir -p /lab',
    ...network.aes.map((ae) => namespaceLine(ae.name)),
    ...network.links.map((link) => linkLine(network, link)),
    ...(network.files ?? []).map(labFileLine),
  ]
}

/**
 * The end of a pipe that sends a program's lines to the event port, each as `<source> <line>`.
 * awk flushes each line as it prints it, so a line reaches the port when it is written, and whole.
 * go-dicom's event log will be tailed into it once released: see `parseEventLine`.
 */
export const eventPortPipe = (source: string): string => `awk '{ print "${source} " $0; fflush() }' > ${VM_EVENT_TTY}`

/**
 * Root's line that makes a link lose `lossPercent` of its packets both ways, or stops when it is
 * 0, with its moment on the event port. netem sits on each end's way out, below what the kernel
 * calls the carrier, so both interfaces stay up. The stamp is the control shell's own clock
 * (bash's EPOCHREALTIME, no new process), taken once the first end loses. `null` when the link is
 * not in the network or the loss is out of range.
 */
export function linkLossLine(network: NetworkDefinition, link: LinkDefinition, lossPercent: number): string | null {
  const [first, second] = link
  const near = interfaceName(network, first, second)
  const far = interfaceName(network, second, first)
  const { min, max } = LINK_LOSS_PERCENT
  const valid = lossPercent === 0 || (Number.isInteger(lossPercent) && lossPercent >= min && lossPercent <= max)
  if (near === null || far === null || !valid) {
    return null
  }
  if (lossPercent === 0) {
    return [
      `tc -n ${first} qdisc del dev ${near} root`,
      `echo "fault off ${first} ${second} $EPOCHREALTIME" > ${VM_EVENT_TTY}`,
      `tc -n ${second} qdisc del dev ${far} root`,
    ].join(' && ')
  }
  // replace, not add: a second loss on the same link changes the first instead of failing.
  return [
    `tc -n ${first} qdisc replace dev ${near} root netem loss ${lossPercent}%`,
    `echo "fault on ${first} ${second} ${lossPercent} $EPOCHREALTIME" > ${VM_EVENT_TTY}`,
    `tc -n ${second} qdisc replace dev ${far} root netem loss ${lossPercent}%`,
  ].join(' && ')
}
