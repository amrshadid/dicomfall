import type { NonEmptyList } from '@dicomfall/core/types'
import { describeType, type Issues, ObjectReader } from '@dicomfall/core/utils'
import {
  type AttributeFinding,
  type ByteRange,
  CHECK_FAILURES,
  CHECK_KINDS,
  type CheckFailure,
  type CheckResult,
  ELEMENT_PARTS,
  GROUPINGS,
  type GroupedFile,
  type MissionVerdict,
} from '#types/definitions/checks'
import { HINT_TIERS } from '#types/definitions/hints'
import type { MissionProgress, OpenDebrief, Progress } from '#types/definitions/progress'

function readMission(mission: ObjectReader): MissionProgress {
  return {
    missionId: mission.string('missionId'),
    firstStartedAt: mission.integer('firstStartedAt', 0),
    completedAt: mission.nullable('completedAt', (key) => mission.integer(key, 0)),
    attempts: mission.integer('attempts', 0),
    hintsRevealed: mission.integer('hintsRevealed', 0, HINT_TIERS.length),
  }
}

/** A field that must be there and be true or false: `flag` would take a missing one as false. */
function readBoolean(reader: ObjectReader, key: string): boolean {
  const value = reader.value(key)
  if (typeof value !== 'boolean') {
    reader.issues.add(reader.pathOf(key), `expected true or false, got ${describeType(value)}`)
    return false
  }
  return value
}

const FAILURES = Object.values(CHECK_FAILURES) as unknown as NonEmptyList<CheckFailure>

const readNullable = <T>(reader: ObjectReader, key: string, read: (value: ObjectReader) => T): T | null =>
  reader.nullable(key, (name) => read(reader.object(name)))

const readNullableText = (reader: ObjectReader, key: string): string | null =>
  reader.nullable(key, (name) => reader.text(name))

const readNullableInteger = (reader: ObjectReader, key: string): number | null =>
  reader.nullable(key, (name) => reader.integer(name, 0))

const readRange = (range: ObjectReader): ByteRange => ({ from: range.integer('from', 0), to: range.integer('to', 0) })

function readGroupedFile(file: ObjectReader): GroupedFile {
  return {
    path: file.string('path'),
    relative: file.string('relative'),
    sopInstanceUid: file.string('sopInstanceUid'),
    studyInstanceUid: file.string('studyInstanceUid'),
    seriesInstanceUid: file.string('seriesInstanceUid'),
  }
}

function readAttribute(attribute: ObjectReader): AttributeFinding {
  return {
    tag: attribute.string('tag'),
    expected: readNullableText(attribute, 'expected'),
    found: readNullableText(attribute, 'found'),
    passed: readBoolean(attribute, 'passed'),
  }
}

/** A check's result as the debrief was shown it: its kind, its verdict and the evidence it read. */
function readResult(result: ObjectReader): CheckResult {
  const before = result.issues.count
  const kind = result.oneOf('kind', CHECK_KINDS)
  const passed = readBoolean(result, 'passed')
  const failure = result.nullable('failure', (key) => result.oneOf(key, FAILURES))
  const judged = { passed, failure }
  if (result.issues.count > before) {
    // A result of no known kind has no evidence to read: one error says so, not one per field.
    return { kind: 'status', passed: false, failure: CHECK_FAILURES.notEvaluated }
  }
  switch (kind) {
    case 'selected':
      return {
        kind,
        ...judged,
        file: readNullableText(result, 'file'),
        target: result.text('target'),
        part: result.nullable('part', (key) => result.oneOf(key, ELEMENT_PARTS)),
        expected: readNullable(result, 'expected', readRange),
        marked: readNullable(result, 'marked', (marked) => ({ file: marked.string('file'), ...readRange(marked) })),
      }
    case 'answer':
      return {
        kind,
        ...judged,
        file: result.string('file'),
        element: result.string('element'),
        vr: readNullableText(result, 'vr'),
        expected: readNullableText(result, 'expected'),
        given: readNullableText(result, 'given'),
      }
    case 'offset':
      return {
        kind,
        ...judged,
        file: result.string('file'),
        element: result.string('element'),
        expected: readNullableInteger(result, 'expected'),
        declared: result.integer('declared', 0),
        given: readNullableInteger(result, 'given'),
      }
    case 'grouped':
      return {
        kind,
        ...judged,
        into: result.string('into'),
        by: result.oneOf('by', GROUPINGS),
        found: result.list('found', (value, at) => readGroupedFile(new ObjectReader(value, at, result.issues))),
        missing: result.stringList('missing'),
      }
    case 'file':
      return {
        kind,
        ...judged,
        file: result.string('file'),
        transferSyntax: readNullableText(result, 'transferSyntax'),
        attributes: result.list('attributes', (value, at) => readAttribute(new ObjectReader(value, at, result.issues))),
      }
    case 'absent':
      return {
        kind,
        ...judged,
        file: result.string('file'),
        element: result.string('element'),
        present: result.nullable('present', (key) => readBoolean(result, key)),
      }
    default:
      if (passed || failure !== CHECK_FAILURES.notEvaluated) {
        result.issues.add(
          result.path,
          'a wire check is never judged here: expected passed false, failure not_evaluated'
        )
      }
      return { kind, passed: false, failure: CHECK_FAILURES.notEvaluated }
  }
}

function readVerdict(verdict: ObjectReader): MissionVerdict {
  return {
    passed: readBoolean(verdict, 'passed'),
    objectives: verdict.list('objectives', (value, at) => {
      const objective = new ObjectReader(value, at, verdict.issues)
      return {
        objectiveId: objective.string('objectiveId'),
        result: readResult(objective.object('result')),
      }
    }),
  }
}

function readOpenDebrief(debrief: ObjectReader): OpenDebrief {
  return {
    missionId: debrief.string('missionId'),
    verdict: debrief.nullable('verdict', (key) => readVerdict(debrief.object(key))),
  }
}

/** Reads a current-version `Progress` from untrusted save data. */
export function readProgress(value: unknown, path: string, issues: Issues): Progress {
  const progress = new ObjectReader(value, path, issues)
  const debrief = progress.optional('debrief', (key) => readOpenDebrief(progress.object(key)))
  return {
    missions: progress.list('missions', (entry, at) => readMission(new ObjectReader(entry, at, issues))),
    completionOrder: progress.stringList('completionOrder'),
    lastActive: progress.nullable('lastActive', (key) => progress.string(key)),
    ...(debrief === undefined ? {} : { debrief }),
  }
}
