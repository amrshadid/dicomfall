import type { StringRule } from '@dicomfall/core/types'
import { describeType, isRecord, joinPath, ObjectReader } from '@dicomfall/core/utils'
import {
  type AttributeValue,
  CHECK_KINDS,
  type CheckDefinition,
  type CheckKind,
  CONTEXT_REJECTIONS,
  DIMSE_MESSAGES,
  ELEMENT_PARTS,
  type FileSelectedCheck,
  GROUPINGS,
  MAX_STATUS,
  MESSAGE_SETS,
  PART10_REGIONS,
  SUBOP_OPERATIONS,
  type WireSelectedCheck,
} from '#types/definitions/checks'

/** The fields each kind of check takes besides `kind`; anything else is reported as a typo. */
const CHECK_FIELDS: Readonly<Record<CheckKind, readonly string[]>> = {
  selected: ['file', 'element', 'region', 'part', 'message', 'set'],
  answer: ['file', 'element'],
  offset: ['file', 'element', 'offset'],
  grouped: ['files', 'into', 'by'],
  file: ['file', 'transferSyntax', 'attributes'],
  absent: ['file', 'element'],
  association: ['abstractSyntax', 'transferSyntax'],
  'rejected-context': ['abstractSyntax', 'result'],
  status: ['status'],
  received: ['ae', 'sopInstanceUid'],
  subops: ['operation', 'completed'],
  echo: ['from', 'to'],
}

const TAG_SOURCE = String.raw`\([0-9A-F]{4},[0-9A-F]{4}\)`

const ITEM_SOURCE = String.raw`\[(?:0|[1-9][0-9]*)\]`

const TAG_PATTERN = new RegExp(`^${TAG_SOURCE}$`)

const TAG: StringRule = { pattern: TAG_PATTERN, expected: 'a tag like (0002,0010)' }

const ELEMENT_PATH: StringRule = {
  pattern: new RegExp(`^${TAG_SOURCE}(?:${ITEM_SOURCE}${TAG_SOURCE})*$`),
  expected: 'a tag like (0002,0010), or a path into a sequence like (0008,1032)[0](0008,0100)',
}

const ITEM_OR_ELEMENT_PATH: StringRule = {
  pattern: new RegExp(`^${TAG_SOURCE}(?:${ITEM_SOURCE}${TAG_SOURCE})*(?:${ITEM_SOURCE})?$`),
  expected:
    'a tag like (0002,0010), a path into a sequence like (0008,1032)[0](0008,0100), or an item like (0008,1032)[0]',
}

/** A path that ends in `[i]` names the item itself, not an element in it. */
const isItemPath = (path: string): boolean => path.endsWith(']')

// PS3.5 §9.1: digits in dot-separated parts, no part with a leading zero, 64 characters at most.
const UID: StringRule = {
  pattern: /^(?=.{1,64}$)(0|[1-9][0-9]*)(\.(0|[1-9][0-9]*))*$/,
  expected: 'a UID like 1.2.840.10008.1.2.1',
}

// No `.` or `..` part: a path that climbs out of /lab/ would name a file the lab never copies.
const LAB_SEGMENT = String.raw`\/(?!\.{1,2}(?:\/|$))[A-Za-z0-9_.+-]+`

/** A file or folder on the lab's disk: every path a mission names is under `/lab/`. */
export const LAB_PATH: StringRule = {
  pattern: new RegExp(`^\\/lab(?:${LAB_SEGMENT})+$`),
  expected: 'a path under /lab/ like /lab/ct.dcm',
}

/** A destination of `lab.files`: a file, or a folder written with its trailing `/`. */
export const LAB_DESTINATION: StringRule = {
  pattern: new RegExp(`^\\/lab(?:${LAB_SEGMENT})+\\/?$`),
  expected: 'a path under /lab/ like /lab/ct.dcm, or a folder like /lab/series/',
}

/** The group of an element path's first tag: `0000` for a Command Set element. */
const groupOf = (path: string): string => path.slice(1, 5)

function readFileSelected(check: ObjectReader): FileSelectedCheck {
  const file = check.string('file', LAB_PATH)
  const element = check.optional('element', (key) => check.string(key, ITEM_OR_ELEMENT_PATH))
  const region = check.optional('region', (key) => check.oneOf(key, PART10_REGIONS))
  const part = check.optional('part', (key) => check.oneOf(key, ELEMENT_PARTS))
  if ((element === undefined) === (region === undefined)) {
    check.issues.add(check.path, 'expected "element" (one element\'s bytes) or "region" (a Part 10 region), not both')
  } else if (part !== undefined && region !== undefined) {
    check.issues.add(check.pathOf('part'), 'only an element has parts: leave "part" out for a region')
  } else if (part === 'vr' && element !== undefined && isItemPath(element)) {
    // PS3.5 §7.5: an item is a tag and a length, with no VR.
    check.issues.add(check.pathOf('part'), 'an item has no VR: expected tag, length or value')
  }
  return {
    kind: 'selected',
    file,
    ...(element !== undefined && { element }),
    ...(region !== undefined && { region }),
    ...(part !== undefined && { part }),
  }
}

function readWireSelected(check: ObjectReader): WireSelectedCheck {
  const message = check.oneOf('message', DIMSE_MESSAGES)
  const set = check.oneOf('set', MESSAGE_SETS)
  const part = check.optional('part', (key) => check.oneOf(key, ELEMENT_PARTS))
  // A Command Set holds group 0000 alone and no sequence; a Data Set never holds group 0000 (PS3.7 §6.3).
  const element = check.string('element', set === 'command' ? TAG : ITEM_OR_ELEMENT_PATH)
  if (check.has('region')) {
    check.issues.add(check.pathOf('region'), 'a region is a part of a file: a message has none')
  }
  if (TAG_PATTERN.test(element.slice(0, 11))) {
    if (set === 'command' && groupOf(element) !== '0000') {
      check.issues.add(check.pathOf('element'), 'a Command Set holds only group 0000 elements')
    } else if (set === 'data' && groupOf(element) === '0000') {
      check.issues.add(check.pathOf('element'), 'group 0000 is the Command Set\'s: expected "set: command"')
    }
  }
  if (part === 'vr' && (set === 'command' || isItemPath(element))) {
    // PS3.7 §6.3.1: a Command Set is always Implicit VR Little Endian; PS3.5 §7.5: an item has no VR.
    check.issues.add(
      check.pathOf('part'),
      `${set === 'command' ? 'a Command Set element' : 'an item'} has no VR on the wire: expected tag, length or value`
    )
  }
  return { kind: 'selected', message, set, element, ...(part !== undefined && { part }) }
}

/** The File inspector's form takes a file; the Wire inspector's takes a message in its place. */
function readSelected(check: ObjectReader): FileSelectedCheck | WireSelectedCheck {
  const wire = check.has('message') || check.has('set')
  if (wire && check.has('file')) {
    check.issues.add(
      check.path,
      'expected "file" (the File inspector) or "message" and "set" (the Wire inspector), not both'
    )
  }
  return wire ? readWireSelected(check) : readFileSelected(check)
}

function readGrouped(check: ObjectReader): Extract<CheckDefinition, { kind: 'grouped' }> {
  const files = check.stringList('files', LAB_PATH)
  if (Array.isArray(check.value('files')) && files.length < 2) {
    check.issues.add(check.pathOf('files'), 'expected two or more files to sort')
  }
  const into = check.string('into', LAB_PATH)
  const by = check.oneOf('by', GROUPINGS)
  const seen = new Set<string>()
  files.forEach((file, at) => {
    if (seen.has(file)) {
      check.issues.add(joinPath(check.pathOf('files'), at), `"${file}" is listed twice`)
    }
    seen.add(file)
    // A file already under `into` could be judged sorted before the player moves anything.
    if (into !== '' && (file === into || file.startsWith(`${into}/`))) {
      check.issues.add(joinPath(check.pathOf('files'), at), `"${file}" already sits under "${into}"`)
    }
  })
  return { kind: 'grouped', files, into, by }
}

function readAttribute(value: unknown, path: string, check: ObjectReader): AttributeValue {
  if (typeof value === 'string') {
    return value
  }
  if (!isRecord(value)) {
    check.issues.add(
      path,
      `expected the value as go-dicom prints it, or { sameAs: { file, element } }, got ${describeType(value)}`
    )
    return ''
  }
  const reader = new ObjectReader(value, path, check.issues)
  reader.rejectUnknownKeys(['sameAs'])
  const sameAs = reader.object('sameAs')
  if (!isRecord(reader.value('sameAs'))) {
    return ''
  }
  sameAs.rejectUnknownKeys(['file', 'element'])
  return { sameAs: { file: sameAs.string('file', LAB_PATH), element: sameAs.string('element', ELEMENT_PATH) } }
}

function readAttributes(check: ObjectReader): Readonly<Record<string, AttributeValue>> {
  const raw = check.value('attributes')
  const path = check.pathOf('attributes')
  if (!isRecord(raw)) {
    check.issues.add(path, `expected an object, got ${describeType(raw)}`)
    return {}
  }
  const attributes: Record<string, AttributeValue> = {}
  for (const [tag, value] of Object.entries(raw)) {
    if (!TAG_PATTERN.test(tag)) {
      check.issues.add(joinPath(path, tag), `expected the key to be ${TAG.expected}`)
    }
    attributes[tag] = readAttribute(value, joinPath(path, tag), check)
  }
  return attributes
}

function readFile(check: ObjectReader): Extract<CheckDefinition, { kind: 'file' }> {
  const file = check.string('file', LAB_PATH)
  const transferSyntax = check.optional('transferSyntax', (key) => check.string(key, UID))
  const attributes = check.optional('attributes', () => readAttributes(check))
  for (const [tag, value] of Object.entries(attributes ?? {})) {
    if (typeof value !== 'string' && value.sameAs.file === file && value.sameAs.element === tag) {
      check.issues.add(joinPath(check.pathOf('attributes'), tag), 'is the same as itself: name another file or element')
    }
  }
  if (transferSyntax === undefined && (attributes === undefined || Object.keys(attributes).length === 0)) {
    check.issues.add(check.path, 'expected "transferSyntax", "attributes" or both: what the file must decode to')
  }
  return {
    kind: 'file',
    file,
    ...(transferSyntax !== undefined && { transferSyntax }),
    ...(attributes !== undefined && { attributes }),
  }
}

/**
 * Reads an objective's `check:` block, by its shape alone: whether its files and AEs are in the
 * mission's lab is checked with the lab, and whether an element is in a file is for the file to say.
 */
export function readCheck(check: ObjectReader): CheckDefinition {
  const problemsSoFar = check.issues.count
  const kind = check.oneOf('kind', CHECK_KINDS)
  // With no kind to go by, the other fields can't be told from typos.
  if (check.issues.count > problemsSoFar) {
    return { kind: 'status', status: 0 }
  }
  check.rejectUnknownKeys(['kind', ...CHECK_FIELDS[kind]])
  switch (kind) {
    case 'selected':
      return readSelected(check)
    case 'answer':
    case 'absent':
      return { kind, file: check.string('file', LAB_PATH), element: check.string('element', ELEMENT_PATH) }
    case 'offset':
      return {
        kind,
        file: check.string('file', LAB_PATH),
        element: check.string('element', ITEM_OR_ELEMENT_PATH),
        offset: check.integer('offset', 0),
      }
    case 'grouped':
      return readGrouped(check)
    case 'file':
      return readFile(check)
    case 'association':
      return {
        kind,
        abstractSyntax: check.string('abstractSyntax', UID),
        transferSyntax: check.string('transferSyntax', UID),
      }
    case 'rejected-context':
      return {
        kind,
        abstractSyntax: check.string('abstractSyntax', UID),
        result: check.oneOf('result', CONTEXT_REJECTIONS),
      }
    case 'status':
      return { kind, status: check.integer('status', 0, MAX_STATUS) }
    case 'received':
      return { kind, ae: check.string('ae'), sopInstanceUid: check.string('sopInstanceUid', UID) }
    case 'subops':
      return { kind, operation: check.oneOf('operation', SUBOP_OPERATIONS), completed: check.integer('completed', 1) }
    case 'echo':
      return { kind, from: check.string('from'), to: check.string('to') }
  }
}
