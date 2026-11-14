import type { StringRule } from '@dicomfall/core/types'
import { joinPath, type ObjectReader } from '@dicomfall/core/utils'
import {
  CHECK_KINDS,
  type CheckDefinition,
  type CheckKind,
  CONTEXT_REJECTIONS,
  MAX_STATUS,
  PART10_REGIONS,
  SUBOP_OPERATIONS,
} from '#types/definitions/checks'

/** The fields each kind of check takes besides `kind`; anything else is reported as a typo. */
const CHECK_FIELDS: Readonly<Record<CheckKind, readonly string[]>> = {
  selected: ['file', 'element', 'region'],
  answer: ['file', 'element'],
  offset: ['file', 'element', 'offset'],
  grouped: ['files'],
  file: ['file', 'transferSyntax', 'attributes'],
  absent: ['file', 'element'],
  association: ['abstractSyntax', 'transferSyntax'],
  'rejected-context': ['abstractSyntax', 'result'],
  status: ['status'],
  received: ['ae', 'sopInstanceUid'],
  subops: ['operation', 'completed'],
  echo: ['from', 'to'],
}

const TAG_PATTERN = /^\([0-9A-F]{4},[0-9A-F]{4}\)$/

const TAG: StringRule = { pattern: TAG_PATTERN, expected: 'a tag like (0002,0010)' }

// PS3.5 §9.1: digits in dot-separated parts, no part with a leading zero, 64 characters at most.
const UID: StringRule = {
  pattern: /^(?=.{1,64}$)(0|[1-9][0-9]*)(\.(0|[1-9][0-9]*))*$/,
  expected: 'a UID like 1.2.840.10008.1.2.1',
}

const LAB_PATH: StringRule = {
  pattern: /^\/[A-Za-z0-9_.+-]+(\/[A-Za-z0-9_.+-]+)*$/,
  expected: 'an absolute path like /lab/ct.dcm',
}

function readSelected(check: ObjectReader): Extract<CheckDefinition, { kind: 'selected' }> {
  const element = check.optional('element', (key) => check.string(key, TAG))
  const region = check.optional('region', (key) => check.oneOf(key, PART10_REGIONS))
  if ((element === undefined) === (region === undefined)) {
    check.issues.add(check.path, 'expected "element" (one element\'s bytes) or "region" (a Part 10 region), not both')
  }
  return {
    kind: 'selected',
    file: check.string('file', LAB_PATH),
    ...(element !== undefined && { element }),
    ...(region !== undefined && { region }),
  }
}

function readGrouped(check: ObjectReader): Extract<CheckDefinition, { kind: 'grouped' }> {
  const files = check.stringList('files', LAB_PATH)
  if (Array.isArray(check.value('files')) && files.length < 2) {
    check.issues.add(check.pathOf('files'), 'expected two or more files to sort')
  }
  return { kind: 'grouped', files }
}

function readFile(check: ObjectReader): Extract<CheckDefinition, { kind: 'file' }> {
  const transferSyntax = check.optional('transferSyntax', (key) => check.string(key, UID))
  const attributes = check.optional('attributes', (key) => check.textMap(key))
  for (const tag of Object.keys(attributes ?? {}).filter((key) => !TAG_PATTERN.test(key))) {
    check.issues.add(joinPath(check.pathOf('attributes'), tag), `expected the key to be ${TAG.expected}`)
  }
  if (transferSyntax === undefined && (attributes === undefined || Object.keys(attributes).length === 0)) {
    check.issues.add(check.path, 'expected "transferSyntax", "attributes" or both: what the file must decode to')
  }
  return {
    kind: 'file',
    file: check.string('file', LAB_PATH),
    ...(transferSyntax !== undefined && { transferSyntax }),
    ...(attributes !== undefined && { attributes }),
  }
}

/**
 * Reads an objective's `check:` block, by its shape alone: whether its files, elements and AEs are
 * in the mission's lab is for the lab to say.
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
      return { kind, file: check.string('file', LAB_PATH), element: check.string('element', TAG) }
    case 'offset':
      return {
        kind,
        file: check.string('file', LAB_PATH),
        element: check.string('element', TAG),
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
