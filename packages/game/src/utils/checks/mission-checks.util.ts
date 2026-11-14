import {
  CHECK_FAILURES,
  type CheckDefinition,
  type CheckResult,
  FILE_CHECK_KINDS,
  type FileCheckDefinition,
  type LabPath,
  type LabReadings,
  type MissionVerdict,
  NO_READINGS,
  type PlayerActions,
  type ReadingRequest,
  type WireCheckDefinition,
} from '#types/definitions/checks'
import type { MissionDefinition, ObjectiveId } from '#types/definitions/mission'
import {
  checkAbsent,
  checkAnswer,
  checkFile,
  checkGrouped,
  checkOffset,
  checkSelected,
  pathsRead,
} from '#utils/checks/file-checks.util'

/** A check this engine judges from go-dicom's readings of the lab's files. */
export const isFileCheck = (check: CheckDefinition): check is FileCheckDefinition =>
  (FILE_CHECK_KINDS as readonly string[]).includes(check.kind)

/**
 * Judges one declared check against what the player has done and go-dicom's readings of the lab.
 * Wire checks, and the Wire inspector's `selected`, read go-dicom's event log; they are left
 * unevaluated, on purpose, and never pass here.
 */
export function evaluateCheck(
  check: CheckDefinition,
  objectiveId: ObjectiveId,
  actions: PlayerActions,
  readings: LabReadings = NO_READINGS
): CheckResult {
  if (!isFileCheck(check)) {
    return { kind: (check as WireCheckDefinition).kind, passed: false, failure: CHECK_FAILURES.notEvaluated }
  }
  switch (check.kind) {
    case 'selected':
      return checkSelected(check, actions, readings)
    case 'answer':
      return checkAnswer(check, objectiveId, actions, readings)
    case 'offset':
      return checkOffset(check, objectiveId, actions, readings)
    case 'grouped':
      return checkGrouped(check, readings)
    case 'file':
      return checkFile(check, readings)
    default:
      return checkAbsent(check, readings)
  }
}

/**
 * Every objective's check over the same actions and the same readings; the mission passes only
 * when all of them do. Pure: the readings are taken by the flow and handed in. Live play merges
 * each verdict into the last with `mergeVerdicts`, so a met objective stays met.
 */
export function judgeMission(
  mission: Pick<MissionDefinition, 'objectives'>,
  actions: PlayerActions,
  readings: LabReadings = NO_READINGS
): MissionVerdict {
  const objectives = mission.objectives.map((objective) => ({
    objectiveId: objective.id,
    result: evaluateCheck(objective.check, objective.id, actions, readings),
  }))
  return { passed: objectives.length > 0 && objectives.every(({ result }) => result.passed), objectives }
}

const unique = (paths: readonly LabPath[]): LabPath[] => [...new Set(paths)]

/** What to read on the Machine before judging the mission's file checks: each path once. */
export function readingRequestOf(mission: Pick<MissionDefinition, 'objectives'>): ReadingRequest {
  const read = mission.objectives.flatMap(({ check }) => (isFileCheck(check) ? [pathsRead(check)] : []))
  return {
    files: unique(read.flatMap((paths) => paths.files)),
    folders: unique(read.flatMap((paths) => paths.folders)),
    startFiles: unique(read.flatMap((paths) => paths.start)),
  }
}
