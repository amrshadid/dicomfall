import type { CodexView, MissionDefinition } from '@dicomfall/game/types'
import type { StoryBlock } from '@dicomfall/missions/types'
import { cardDataOf, type MissionLabel } from '@features/codex/utils/book'
import type { DebriefStage } from '@features/debrief/types'
import type { CodexCardData } from '@shared/types'
import { DEFAULT_HEADLINE, NOT_PASSED, SENTENCE_END } from './debrief-card.constants'

/** The debrief section's first sentence, as Kernelfall's card takes its headline from its debrief. */
export function debriefHeadlineOf(debrief: readonly StoryBlock[] | undefined): string {
  const first = debrief?.find((block) => block.kind === 'line')
  return first?.kind === 'line' ? (first.text.split(SENTENCE_END)[0] ?? DEFAULT_HEADLINE) : DEFAULT_HEADLINE
}

/**
 * The result line under the headline, as Kernelfall's card writes it ("Level complete · 2 of 2 ·
 * Taint 0, clean"): the mission and its objectives. DICOMFall has no Taint and nothing timed, so
 * those parts are left out rather than stood in for.
 */
export function debriefResultOf(passed: boolean, objectives: number): string {
  return passed ? ['Mission complete', `${objectives} of ${objectives} objectives met`].join(' · ') : NOT_PASSED
}

/** The cards the mission files, in its own order, as the Codex prints them. */
export function filedCardsOf(codex: CodexView, mission: MissionDefinition, label: MissionLabel): CodexCardData[] {
  const entries = codex.chapters.flatMap((chapter) => chapter.cards)
  return mission.codex.flatMap((card) => {
    const entry = entries.find((candidate) => candidate.card.id === card.id && candidate.missionId === mission.id)
    return entry ? [cardDataOf(entry, label)] : []
  })
}

/** The stage the mission belongs to, once all of it is completed: Kernelfall shows a region it closes. */
export function finishedStageOf(codex: CodexView, mission: MissionDefinition): DebriefStage | null {
  const chapter = codex.chapters.find((candidate) => candidate.chapter.id === mission.chapter)
  if (!chapter?.finished || chapter.youCanNow.length === 0) {
    return null
  }
  // A labelled chapter's heading is its label ("Bridge"), never a stage number.
  return { name: `${chapter.chapter.heading} · ${chapter.chapter.title}`, outcomes: chapter.youCanNow }
}
