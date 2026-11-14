import type { MissionDefinition, MissionVerdict, ObjectiveId, PlayerActions } from '@dicomfall/game/types'
import type { GuideObjective, GuideObjectiveInput } from '@features/guide/types'
import { objectiveWordsOf } from './objective-words.util'

/** What the Guide's answer and offset boxes act on: the player's actions so far, and how to give a value. */
export interface ObjectiveBoxes {
  readonly actions: PlayerActions
  readonly answer: (objective: ObjectiveId, value: string) => void
  readonly predict: (objective: ObjectiveId, offset: number) => void
}

/** A whole number of bytes, as typed: `328`, ` 328 `; anything else is not an offset. */
const OFFSET_TYPED = /^\s*\d+\s*$/

function inputOf(
  objective: MissionDefinition['objectives'][number],
  boxes: ObjectiveBoxes | null
): GuideObjectiveInput | null {
  const { kind } = objective.check
  if (boxes === null || (kind !== 'answer' && kind !== 'offset')) {
    return null
  }
  if (kind === 'answer') {
    const given = boxes.actions.answers[objective.id]
    return {
      kind,
      label: objective.text,
      given: given ?? null,
      onSubmit: (value) => boxes.answer(objective.id, value),
    }
  }
  const given = boxes.actions.predictions[objective.id]
  return {
    kind,
    label: objective.text,
    given: given === undefined ? null : String(given),
    onSubmit: (value) => {
      if (OFFSET_TYPED.test(value)) {
        boxes.predict(objective.id, Number.parseInt(value, 10))
      }
    },
  }
}

/**
 * The mission's objectives as the Guide lists them: each with its state, the line that says what
 * the check saw, and, for an open `answer` or `offset` objective, its box. `boxes` is null where
 * nothing can be given (a debrief, a test of the list alone).
 */
export function guideObjectivesOf(
  mission: Pick<MissionDefinition, 'objectives'>,
  verdict: MissionVerdict | null,
  boxes: ObjectiveBoxes | null = null
): readonly GuideObjective[] {
  return mission.objectives.map((objective) => {
    const result = verdict?.objectives.find((judged) => judged.objectiveId === objective.id)?.result ?? null
    const words = objectiveWordsOf(result)
    const passed = result?.passed ?? false
    return {
      id: objective.id,
      text: objective.text,
      passed,
      state: passed ? 'met' : words.state,
      input: passed ? null : inputOf(objective, boxes),
      observed: passed ? null : words.observed,
      evidence: passed ? words.evidence : null,
    }
  })
}
