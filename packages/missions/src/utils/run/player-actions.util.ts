import { NO_PLAYER_ACTIONS, type PlayerActions } from '@dicomfall/game/types'
import type { GoldenChange } from '#utils/run/golden-run.util'

/**
 * What the player has done after one more change, as live play holds it: a `select` replaces the
 * marked range, an `answer` or `predict` fills its box. A `shell` change leaves them as they are:
 * what it does reaches the checks only through the lab's files, read again after it.
 */
export function applyChange(actions: PlayerActions, change: GoldenChange): PlayerActions {
  if ('select' in change) {
    return { ...actions, selection: change.select }
  }
  if ('answer' in change) {
    return { ...actions, answers: { ...actions.answers, [change.answer.objective]: change.answer.value } }
  }
  if ('predict' in change) {
    return {
      ...actions,
      predictions: { ...actions.predictions, [change.predict.objective]: change.predict.offset },
    }
  }
  return actions
}

/** The player's actions after each change of a run, in order. */
export function actionsAfterEach(changes: readonly GoldenChange[]): PlayerActions[] {
  const after: PlayerActions[] = []
  let actions = NO_PLAYER_ACTIONS
  for (const change of changes) {
    actions = applyChange(actions, change)
    after.push(actions)
  }
  return after
}
