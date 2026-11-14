import type { MissionVerdict } from '#types/definitions/checks'
import type { MissionDefinition } from '#types/definitions/mission'

/** Every objective of the mission met, as the missions package would judge a solved one. */
export function passedVerdict(mission: MissionDefinition): MissionVerdict {
  return {
    passed: true,
    objectives: mission.objectives.map(({ id, check }) => ({ objectiveId: id, kind: check.kind, passed: true })),
  }
}

/** Every objective met but the last. */
export function failedVerdict(mission: MissionDefinition): MissionVerdict {
  const last = mission.objectives.length - 1
  return {
    passed: false,
    objectives: mission.objectives.map(({ id, check }, at) => ({
      objectiveId: id,
      kind: check.kind,
      passed: at < last,
    })),
  }
}
