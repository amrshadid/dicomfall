import { codexView } from '@dicomfall/game/utils'
import { describe, expect, it } from 'vitest'
import { DEBRIEF_CHAPTER, DEBRIEF_CONTENT, DEBRIEF_MISSION, debriefProgressOf } from '@/test/fixtures/debrief.fixture'
import { DEFAULT_HEADLINE, NOT_PASSED } from './debrief-card.constants'
import { debriefHeadlineOf, debriefResultOf, filedCardsOf, finishedStageOf } from './debrief-card.util'

const mission = DEBRIEF_MISSION

const label = (id: string) => `1.1 ${id}`

describe('debriefHeadlineOf', () => {
  it("takes the debrief's first sentence, as Kernelfall's card does", () => {
    const debrief = [
      { kind: 'line', speaker: 'The Preamble', text: 'A file is four regions. You found every one.' },
    ] as const
    expect(debriefHeadlineOf(debrief)).toBe('A file is four regions.')
  })

  it('ends the sentence at a question mark too', () => {
    const debrief = [{ kind: 'line', speaker: null, text: 'What is a file? Four regions.' }] as const
    expect(debriefHeadlineOf(debrief)).toBe('What is a file?')
  })

  it('falls back to "Mission complete." without a debrief line', () => {
    expect(debriefHeadlineOf(undefined)).toBe(DEFAULT_HEADLINE)
    expect(debriefHeadlineOf([])).toBe(DEFAULT_HEADLINE)
  })
})

describe('debriefResultOf', () => {
  it('says the mission is complete with every objective met, and nothing timed', () => {
    expect(debriefResultOf(true, 2)).toBe('Mission complete · 2 of 2 objectives met')
  })

  it('says an objective is still open before the mission passes', () => {
    expect(debriefResultOf(false, 2)).toBe(NOT_PASSED)
  })
})

describe('filedCardsOf', () => {
  it("prints the mission's own cards, as the Codex prints them", () => {
    const cards = filedCardsOf(codexView(debriefProgressOf(true), DEBRIEF_CONTENT), mission, label)
    expect(cards.map((card) => card.term)).toEqual(['the preamble', 'the DICM prefix'])
    expect(cards[0]?.filedIn).toBe(`1.1 ${mission.id}`)
    expect(cards[0]?.sources[0]?.path).toBe('filereader/filereader.go')
  })
})

describe('finishedStageOf', () => {
  it('gives the stage\'s "You can now…" lines once every mission in it is completed', () => {
    expect(finishedStageOf(codexView(debriefProgressOf(true), DEBRIEF_CONTENT), mission)).toEqual({
      name: 'Stage 1 · The First File',
      outcomes: ['Find the four regions of a Part 10 file.'],
    })
  })

  it('names a labelled chapter by its label, never a stage number', () => {
    const { stage: _stage, ...unnumbered } = DEBRIEF_CHAPTER
    const view = codexView(debriefProgressOf(true), DEBRIEF_CONTENT)
    const relabelled = {
      ...view,
      chapters: view.chapters.map((chapter) => ({
        ...chapter,
        chapter: { ...unnumbered, outcomes: chapter.chapter.outcomes, label: 'Bridge', heading: 'Bridge' },
      })),
    }
    expect(finishedStageOf(relabelled, mission)?.name).toBe('Bridge · The First File')
  })

  it('gives nothing while the stage is still open, or when it lists no outcomes', () => {
    expect(finishedStageOf(codexView(debriefProgressOf(false), DEBRIEF_CONTENT), mission)).toBeNull()
    // The loader refuses a stage with missions and no outcomes; the debrief still draws nothing for one.
    const view = codexView(debriefProgressOf(true), DEBRIEF_CONTENT)
    const silent = { ...view, chapters: view.chapters.map((chapter) => ({ ...chapter, youCanNow: [] })) }
    expect(finishedStageOf(silent, mission)).toBeNull()
  })
})
