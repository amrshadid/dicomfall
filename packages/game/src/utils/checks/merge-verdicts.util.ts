import type { MissionVerdict } from '#types/definitions/checks'

/**
 * The verdict of a play-through so far: an objective met by any judging stays met (MISSIONS.md,
 * Checks), since a player marks one range at a time and the box may be cleared afterwards. An
 * objective not met yet takes the latest result, so its reason stays current.
 */
export function mergeVerdicts(previous: MissionVerdict | null, latest: MissionVerdict): MissionVerdict {
  if (previous === null) {
    return latest
  }
  const metBefore = new Map(
    previous.objectives
      .filter((objective) => objective.result.passed)
      .map((objective) => [objective.objectiveId, objective])
  )
  const objectives = latest.objectives.map((objective) => metBefore.get(objective.objectiveId) ?? objective)
  return { passed: objectives.length > 0 && objectives.every((objective) => objective.result.passed), objectives }
}
