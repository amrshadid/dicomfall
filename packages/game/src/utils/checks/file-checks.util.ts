import {
  type AttributeFinding,
  type AttributeValue,
  type ByteRange,
  CHECK_FAILURES,
  type CheckFailure,
  type CheckResult,
  type ElementPath,
  type FileCheckDefinition,
  type FileRead,
  type FileReading,
  type FileSelectedCheck,
  type GroupedFile,
  type LabPath,
  type LabReadings,
  type PlayerActions,
  type Uid,
} from '#types/definitions/checks'
import type { ObjectiveId } from '#types/definitions/mission'
import { sameValue } from '#utils/checks/answer-value.util'
import { findTarget, rangeOf, regionRange, startOf } from '#utils/checks/element-path.util'

type Check<K extends FileCheckDefinition['kind']> = Extract<FileCheckDefinition, { kind: K }>
type Result<K extends CheckResult['kind']> = Extract<CheckResult, { kind: K }>

const SOP_INSTANCE_UID = '(0008,0018)'
const STUDY_INSTANCE_UID = '(0020,000D)'
const SERIES_INSTANCE_UID = '(0020,000E)'

/** go-dicom's reading of a file, or why the check cannot look at it. */
function readingOf(read: FileRead | undefined): { reading: FileReading } | { failure: CheckFailure } {
  if (read === undefined) {
    return { failure: CHECK_FAILURES.notRead }
  }
  return read.ok ? { reading: read.reading } : { failure: CHECK_FAILURES.unreadable }
}

/** An element's decoded value and VR, or null when the file holds no such element. */
function valueAt(reading: FileReading, path: ElementPath): { vr: string; value: string | null } | null {
  const target = findTarget(reading, path)
  if (target === null) {
    return null
  }
  return target.kind === 'element'
    ? { vr: target.element.vr, value: target.element.value ?? null }
    : { vr: 'item', value: null }
}

const sameRange = (marked: ByteRange, expected: ByteRange): boolean =>
  marked.from === expected.from && marked.to === expected.to

/**
 * The player's marked range is exactly go-dicom's bytes for the region, the element or item, or
 * the part of it: byte for byte, in the named file. The Wire inspector's form reads the event log
 * and is not judged here.
 */
export function checkSelected(
  check: Check<'selected'>,
  actions: PlayerActions,
  readings: LabReadings
): Result<'selected'> {
  if (!('file' in check)) {
    return {
      kind: 'selected',
      passed: false,
      failure: CHECK_FAILURES.notEvaluated,
      file: null,
      target: check.element,
      part: check.part ?? null,
      expected: null,
      marked: null,
    }
  }
  const fileCheck: FileSelectedCheck = check
  const target = fileCheck.region ?? fileCheck.element ?? ''
  const marked = actions.selection
  const base = { kind: 'selected' as const, file: fileCheck.file, target, part: fileCheck.part ?? null, marked }
  const read = readingOf(readings.files[fileCheck.file])
  let expected: ByteRange | null = null
  let failure: CheckFailure | null = null
  if ('failure' in read) {
    failure = read.failure
  } else if (fileCheck.region !== undefined) {
    expected = regionRange(read.reading, fileCheck.region)
    failure = expected === null ? CHECK_FAILURES.noRegion : null
  } else {
    const found = findTarget(read.reading, fileCheck.element ?? '')
    expected = found === null ? null : rangeOf(found, fileCheck.part ?? null)
    failure = found === null ? CHECK_FAILURES.noElement : expected === null ? CHECK_FAILURES.noPart : null
  }
  if (failure === null) {
    if (marked === null) {
      failure = CHECK_FAILURES.notMarked
    } else if (marked.file !== fileCheck.file) {
      failure = CHECK_FAILURES.wrongFile
    } else if (expected === null || !sameRange(marked, expected)) {
      failure = CHECK_FAILURES.wrongRange
    }
  }
  return { ...base, expected, passed: failure === null, failure }
}

/** The answer box holds go-dicom's decoded value of the element, compared as `sameValue` says. */
export function checkAnswer(
  check: Check<'answer'>,
  objectiveId: ObjectiveId,
  actions: PlayerActions,
  readings: LabReadings
): Result<'answer'> {
  const given = actions.answers[objectiveId] ?? null
  const base = { kind: 'answer' as const, file: check.file, element: check.element, given }
  const read = readingOf(readings.files[check.file])
  if ('failure' in read) {
    return { ...base, vr: null, expected: null, passed: false, failure: read.failure }
  }
  const found = valueAt(read.reading, check.element)
  const vr = found?.vr ?? null
  const expected = found?.value ?? null
  const failure =
    found === null
      ? CHECK_FAILURES.noElement
      : expected === null
        ? CHECK_FAILURES.noValue
        : given === null || given.trim() === ''
          ? CHECK_FAILURES.notGiven
          : sameValue(given, expected, found.vr)
            ? null
            : CHECK_FAILURES.wrongValue
  return { ...base, vr, expected, passed: failure === null, failure }
}

/** The predicted offset is where go-dicom says the element or item starts: its tag's first byte. */
export function checkOffset(
  check: Check<'offset'>,
  objectiveId: ObjectiveId,
  actions: PlayerActions,
  readings: LabReadings
): Result<'offset'> {
  const given = actions.predictions[objectiveId] ?? null
  const base = { kind: 'offset' as const, file: check.file, element: check.element, declared: check.offset, given }
  const read = readingOf(readings.files[check.file])
  if ('failure' in read) {
    return { ...base, expected: null, passed: false, failure: read.failure }
  }
  const target = findTarget(read.reading, check.element)
  const expected = target === null ? null : startOf(target)
  const failure =
    expected === null
      ? CHECK_FAILURES.noElement
      : given === null
        ? CHECK_FAILURES.notGiven
        : given === expected
          ? null
          : CHECK_FAILURES.wrongOffset
  return { ...base, expected, passed: failure === null, failure }
}

/** The SOP, Study and Series Instance UIDs of a file go-dicom read; null for one missing any. */
function uidsOf(reading: FileReading): Omit<GroupedFile, 'path' | 'relative'> | null {
  const [sop, study, series] = [SOP_INSTANCE_UID, STUDY_INSTANCE_UID, SERIES_INSTANCE_UID].map(
    (tag) => valueAt(reading, tag)?.value ?? null
  )
  return sop && study && series ? { sopInstanceUid: sop, studyInstanceUid: study, seriesInstanceUid: series } : null
}

/** Why folders and groups do not pair one to one (each folder one group, each group one folder), or null when they do. */
function pairing(pairs: readonly (readonly [string, string])[]): CheckFailure | null {
  const groupsOf = new Map<string, Set<string>>()
  const foldersOf = new Map<string, Set<string>>()
  for (const [folder, group] of pairs) {
    groupsOf.set(folder, (groupsOf.get(folder) ?? new Set()).add(group))
    foldersOf.set(group, (foldersOf.get(group) ?? new Set()).add(folder))
  }
  if ([...groupsOf.values()].some((groups) => groups.size > 1)) {
    return CHECK_FAILURES.mixedFolder
  }
  return [...foldersOf.values()].some((folders) => folders.size > 1) ? CHECK_FAILURES.splitGroup : null
}

/**
 * Every file of the set, found by its SOP Instance UID (as the lab started) anywhere under `into`,
 * sits in a folder of its own study (`by: study`: `into/<study>/<file>`), or in a study folder then
 * a series folder (`by: series`: `into/<study>/<series>/<file>`), split exactly as go-dicom reads
 * their Study and Series Instance UIDs. Folder names are free. Every DICOM file under `into` counts,
 * so a stray file of another study breaks "a folder of its own"; files go-dicom cannot read are
 * not DICOM and are left out.
 */
export function checkGrouped(check: Check<'grouped'>, readings: LabReadings): Result<'grouped'> {
  const base = { kind: 'grouped' as const, into: check.into, by: check.by }
  const wanted: Uid[] = []
  for (const path of check.files) {
    const read = readingOf(readings.start[path])
    const uids = 'reading' in read ? uidsOf(read.reading) : null
    if (uids === null) {
      const failure = 'failure' in read ? read.failure : CHECK_FAILURES.noElement
      return { ...base, found: [], missing: [], passed: false, failure }
    }
    wanted.push(uids.sopInstanceUid)
  }
  const listed = readings.folders[check.into]
  if (listed === undefined) {
    return { ...base, found: [], missing: wanted, passed: false, failure: CHECK_FAILURES.notRead }
  }
  const prefix = `${check.into.replace(/\/+$/, '')}/`
  const found: GroupedFile[] = listed.flatMap((path) => {
    const read = readings.files[path]
    const uids = read?.ok ? uidsOf(read.reading) : null
    return uids === null || !path.startsWith(prefix) ? [] : [{ path, relative: path.slice(prefix.length), ...uids }]
  })
  const present = new Set(found.map((file) => file.sopInstanceUid))
  const missing = wanted.filter((uid) => !present.has(uid))
  const depth = check.by === 'study' ? 2 : 3
  const folders = found.map((file) => file.relative.split('/'))
  let failure: CheckFailure | null = missing.length > 0 ? CHECK_FAILURES.missingFiles : null
  if (failure === null && folders.some((parts) => parts.length !== depth)) {
    failure = CHECK_FAILURES.wrongDepth
  }
  if (failure === null) {
    failure = pairing(found.map((file, at) => [folders[at]?.[0] ?? '', file.studyInstanceUid] as const))
  }
  if (failure === null && check.by === 'series') {
    failure = pairing(
      found.map((file, at) => [`${folders[at]?.[0]}/${folders[at]?.[1]}`, file.seriesInstanceUid] as const)
    )
  }
  return { ...base, found, missing, passed: failure === null, failure }
}

/** The value an attribute must have: as written, or another file's (null when that one is unread). */
function expectedValue(value: AttributeValue, readings: LabReadings): string | null {
  if (typeof value === 'string') {
    return value
  }
  const read = readings.files[value.sameAs.file]
  return read?.ok ? (valueAt(read.reading, value.sameAs.element)?.value ?? null) : null
}

/** The file decodes, with that transfer syntax, to those attributes as go-dicom prints them. */
export function checkFile(check: Check<'file'>, readings: LabReadings): Result<'file'> {
  const base = { kind: 'file' as const, file: check.file }
  const read = readingOf(readings.files[check.file])
  if ('failure' in read) {
    return { ...base, transferSyntax: null, attributes: [], passed: false, failure: read.failure }
  }
  const transferSyntax = read.reading.transferSyntax.uid
  const attributes: AttributeFinding[] = Object.entries(check.attributes ?? {}).map(([tag, value]) => {
    const expected = expectedValue(value, readings)
    const at = valueAt(read.reading, tag)
    const found = at?.value ?? null
    const passed = expected !== null && found !== null && at !== null && sameValue(found, expected, at.vr)
    return { tag, expected, found, passed }
  })
  const failure =
    check.transferSyntax !== undefined && check.transferSyntax !== transferSyntax
      ? CHECK_FAILURES.wrongTransferSyntax
      : attributes.every((attribute) => attribute.passed)
        ? null
        : CHECK_FAILURES.wrongAttribute
  return { ...base, transferSyntax, attributes, passed: failure === null, failure }
}

/** The file decodes and no longer holds the element. */
export function checkAbsent(check: Check<'absent'>, readings: LabReadings): Result<'absent'> {
  const base = { kind: 'absent' as const, file: check.file, element: check.element }
  const read = readingOf(readings.files[check.file])
  if ('failure' in read) {
    return { ...base, present: null, passed: false, failure: read.failure }
  }
  const present = findTarget(read.reading, check.element) !== null
  return { ...base, present, passed: !present, failure: present ? CHECK_FAILURES.stillPresent : null }
}

/** Every file a check reads now, and the folders it lists. */
export function pathsRead(check: FileCheckDefinition): { files: LabPath[]; folders: LabPath[]; start: LabPath[] } {
  switch (check.kind) {
    case 'selected':
      return { files: 'file' in check ? [check.file] : [], folders: [], start: [] }
    case 'grouped':
      return { files: [], folders: [check.into], start: [...check.files] }
    case 'file':
      return {
        files: [
          check.file,
          ...Object.values(check.attributes ?? {}).flatMap((value) =>
            typeof value === 'string' ? [] : [value.sameAs.file]
          ),
        ],
        folders: [],
        start: [],
      }
    default:
      return { files: [check.file], folders: [], start: [] }
  }
}
