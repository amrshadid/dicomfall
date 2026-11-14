import { useActiveMission, useHints } from '@dicomfall/game/hooks'
import { useMachineStatus, useTerminalCommand } from '@dicomfall/machine/hooks'
import { useContent } from '@features/content/hooks/content'
import { GuidePresentation } from '@features/guide/components/guide'
import type { GuideAction, GuidePace, GuideStepId } from '@features/guide/types'
import { guideObjectivesOf } from '@features/guide/utils/objectives'
import { labStatusOf, waitReasonOf } from '@features/guide/utils/run'
import {
  BUILD_NOTE,
  beatsOf,
  blocksFor,
  chipsOf,
  hintGuideOf,
  hintsOf,
  pacedGuideOf,
  stepLabelOf,
} from '@features/guide/utils/story'
import type { UseMissionLabResult } from '@features/mission/hooks/lab'
import type { UseMissionPlayResult } from '@features/mission/hooks/play'
import { shortcutLabelOf } from '@features/shortcuts/utils/keys'
import { useMachineLock } from '@shared/hooks/machine'
import { hrefOf } from '@shared/navigation'
import { useMemo } from 'react'

export interface GuideContainerProps {
  /** The mission's lab on the Machine: where it is, and why it failed. */
  run: Pick<UseMissionLabResult, 'phase' | 'errors'>
  step: GuideStepId
  reviewing: GuideStepId | null
  /** Ends a look back at a done step. */
  onEndReview: () => void
  /** The lab was reset this visit: the verdict saved before it no longer applies. */
  startedOver: boolean
  /** Null while a question of the step waits for its answer, as well as where there is no way on. */
  onNext: (() => void) | null
  onSkipToBuild: (() => void) | null
  /** How far into the current step's story the player is; the screen releases its pauses. */
  pace: GuidePace
  /** Asks before the lab goes back to how the mission found it. */
  onStartOver: () => void
  /**
   * The play-through judged live, and the objectives' boxes; left out, the Guide shows the verdict
   * the game kept and no box.
   */
  play?: Pick<UseMissionPlayResult, 'verdict' | 'actions' | 'answer' | 'predict'> | null
}

// The guide of a chapter that names none: the Preamble, who guides the first one.
const DEFAULT_GUIDE = 'The Preamble'

const NEXT_LABEL: Readonly<Partial<Record<GuideStepId, string>>> = {
  scene: 'Next: See it',
  see: 'Next: Build it',
  build: 'Next: Watch it',
  watch: 'Next: the debrief',
}

/**
 * The mission's story, paced by the player's commands: the command a beat asks for, finished at
 * the console, shows the next beat, and Continue always does. Then its objectives, its chips,
 * hints and Codex cards, and the lab's actions.
 */
export function GuideContainer({
  run,
  step,
  reviewing,
  onEndReview,
  startedOver,
  onNext,
  onSkipToBuild,
  pace,
  onStartOver,
  play = null,
}: GuideContainerProps) {
  const { mission, phase, verdict: lastAttempt } = useActiveMission()
  const content = useContent()
  const hints = useHints()
  const command = useTerminalCommand()
  const lock = useMachineLock(useMachineStatus())
  const shown = reviewing ?? step

  const story = mission ? content.storyOf(mission.id)?.sections : undefined
  const beats = useMemo(() => beatsOf(blocksFor(shown, story)), [shown, story])
  if (!mission || phase === null) {
    return null
  }

  // The live verdict while the lab is played. Before its first judging, the last the game kept:
  // after Start over that one describes a lab that is gone, except beside the debrief, which shows
  // the passing play-through.
  const kept = phase === 'debrief' || !startedOver ? lastAttempt : null
  const verdict = phase === 'debrief' ? kept : (play?.verdict ?? kept)
  const paced = pacedGuideOf(beats, pace, reviewing !== null)
  const wait = waitReasonOf(run.phase)
  const onLab = step === 'see' || step === 'build' || step === 'watch'
  // Values are given while the lab is played, not over the scene or the debrief.
  const boxes = play !== null && onLab && reviewing === null ? play : null
  const label = stepLabelOf(shown)
  // A chip's keys would land in a frozen console; a lab being restored holds them for its new shell.
  const consoleTakesKeys = lock === null || lock.holdsKeys

  // The way on first, then Start over. Objectives tick by themselves, so there is nothing to
  // submit. A look back offers only the way back, as Kernelfall's Guide does.
  const actions: GuideAction[] = []
  if (reviewing !== null) {
    actions.push({ id: 'back', label: `Back to ${stepLabelOf(step)}`, kind: 'primary', onSelect: onEndReview })
  }
  if (onNext !== null && reviewing === null) {
    actions.push({
      id: 'next',
      label: NEXT_LABEL[step] ?? 'Next',
      kind: 'primary',
      keys: shortcutLabelOf('next-step'),
      onSelect: onNext,
    })
  }
  if (onSkipToBuild !== null && reviewing === null) {
    actions.push({ id: 'skip', label: 'Skip to Build it', kind: 'quiet', onSelect: onSkipToBuild })
  }
  if (onLab && reviewing === null) {
    actions.push({ id: 'start-over', label: 'Start over', kind: 'quiet', unavailable: wait, onSelect: onStartOver })
  }

  return (
    <GuidePresentation
      stepLabel={label}
      reviewNote={reviewing ? `Looking again at ${label}. Your progress is kept.` : null}
      lead={null}
      beats={paced.beats}
      onContinue={paced.onContinue}
      showObjectives={reviewing !== null || shown !== 'scene'}
      objectives={guideObjectivesOf(mission, verdict, boxes)}
      chips={
        (step === 'see' || step === 'build') && reviewing === null
          ? chipsOf(mission.chips, consoleTakesKeys ? command.run : null)
          : []
      }
      hints={{
        by:
          hintGuideOf(story) ??
          content.game.chapters.find((chapter) => chapter.id === mission.chapter)?.guide ??
          DEFAULT_GUIDE,
        revealed: hintsOf(hints.revealed, hints.revealed.length),
        left: hints.left,
        onReveal: onLab && hints.next !== null ? () => void hints.reveal() : null,
      }}
      codex={mission.codex.map((card) => ({
        id: card.id,
        term: card.term,
        // Over the mission, not the Codex screen: reading a card never leaves the mission.
        href: hrefOf({ name: 'mission', missionId: mission.id, card: card.id }),
      }))}
      codexOpen={reviewing !== null || shown === 'watch' || shown === 'debrief'}
      note={step === 'build' && reviewing === null ? BUILD_NOTE : null}
      status={labStatusOf(run.phase, run.errors)}
      actions={actions}
    />
  )
}
