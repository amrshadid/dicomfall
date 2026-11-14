import type { GuideStepId } from '@features/guide/types'
import type { MissionPanels } from '@features/mission/types'

/**
 * The done step before the one looked at, for Kernelfall's "Look at the previous step" key: from
 * the current step, the last done one; from a step looked back at, the one before it. Null at the
 * first step.
 */
export function previousStepOf<T extends string>(done: readonly T[], reviewing: T | null): T | null {
  const from = reviewing === null ? done.length : done.indexOf(reviewing)
  return from > 0 ? (done[from - 1] ?? null) : null
}

/**
 * The panels a step of the story has opened: absent, not greyed out, until the story needs them.
 * The scene is read beside the Lightbox alone; the Inspector comes with See it, the first step
 * played on the lab. Settings can still show every panel.
 */
export function panelsOfStep(step: GuideStepId): MissionPanels {
  return {
    lightbox: true,
    inspector: step !== 'scene',
  }
}
