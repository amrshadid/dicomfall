import { CHECK_FAILURES, type CheckResult, type MissionVerdict } from '#types/definitions/checks'
import type { MissionDefinition, ObjectiveDefinition } from '#types/definitions/mission'

/** A result of the objective's kind; the evidence is not what these tests look at. */
function resultOf(objective: ObjectiveDefinition, passed: boolean): CheckResult {
  const failure = passed ? null : CHECK_FAILURES.notGiven
  const { check } = objective
  switch (check.kind) {
    case 'answer':
      return {
        kind: 'answer',
        passed,
        failure,
        file: check.file,
        element: check.element,
        vr: 'CS',
        expected: 'CT',
        given: passed ? 'CT' : null,
      }
    case 'offset':
      return {
        kind: 'offset',
        passed,
        failure,
        file: check.file,
        element: check.element,
        expected: check.offset,
        declared: check.offset,
        given: passed ? check.offset : null,
      }
    default:
      return {
        kind: 'absent',
        passed,
        failure: passed ? null : CHECK_FAILURES.stillPresent,
        file: '/lab/x.dcm',
        element: '(0010,0010)',
        present: !passed,
      }
  }
}

/** Every objective of the mission met, as the missions package would judge a solved one. */
export function passedVerdict(mission: MissionDefinition): MissionVerdict {
  return {
    passed: true,
    objectives: mission.objectives.map((objective) => ({
      objectiveId: objective.id,
      result: resultOf(objective, true),
    })),
  }
}

/** Every objective met but the last. */
export function failedVerdict(mission: MissionDefinition): MissionVerdict {
  const last = mission.objectives.length - 1
  return {
    passed: false,
    objectives: mission.objectives.map((objective, at) => ({
      objectiveId: objective.id,
      result: resultOf(objective, at < last),
    })),
  }
}
