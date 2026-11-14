import { describe, expect, it } from 'vitest'
import { EXAMPLE_MISSION, exampleContent, FOLLOW_UP_MISSION } from '#test/index'
import type { CodexView } from '#types/definitions/codex'
import type { Progress } from '#types/definitions/progress'
import { codexView, collectCodex } from '#utils/codex/codex.util'
import { emptyProgress, startMission } from '#utils/progress/index'

const content = exampleContent()

const FIRST_CARD = 'transfer-syntax'
const SECOND_CARD = 'implicit-vr'

function completed(progress: Progress, missionId: string): Progress {
  return {
    ...progress,
    missions: progress.missions.map((record) =>
      record.missionId === missionId ? { ...record, completedAt: 5 } : record
    ),
    completionOrder: [...progress.completionOrder, missionId],
  }
}

const states = (view: CodexView) =>
  view.chapters.flatMap((chapter) => chapter.cards.map((entry) => [entry.card.id, entry.state]))

describe('codexView', () => {
  it('makes one chapter per stage that adds cards, its cards in play order with their mission number', () => {
    const view = codexView(emptyProgress(), content)
    expect(view.chapters.map((chapter) => chapter.chapter.id)).toEqual(['the-first-file'])
    expect(view.chapters[0]?.cards.map((entry) => [entry.card.id, entry.missionId, entry.missionNumber])).toEqual([
      [FIRST_CARD, EXAMPLE_MISSION.id, '1.1'],
      [SECOND_CARD, FOLLOW_UP_MISSION.id, '1.2'],
    ])
    expect(view).toMatchObject({ filed: 0, total: 2, glossary: [] })
  })

  it('hides the cards of missions not started, shows them once started and files them once completed', () => {
    expect(states(codexView(emptyProgress(), content))).toEqual([
      [FIRST_CARD, 'hidden'],
      [SECOND_CARD, 'hidden'],
    ])
    const started = startMission(emptyProgress(), EXAMPLE_MISSION.id, 1)
    expect(states(codexView(started, content))).toEqual([
      [FIRST_CARD, 'seen'],
      [SECOND_CARD, 'hidden'],
    ])
    expect(states(codexView(completed(started, EXAMPLE_MISSION.id), content))).toEqual([
      [FIRST_CARD, 'filed'],
      [SECOND_CARD, 'hidden'],
    ])
  })

  it('links a deepens chain both ways', () => {
    const [first, second] = codexView(emptyProgress(), content).chapters[0]?.cards ?? []
    expect(first?.deepens).toBeNull()
    expect(first?.deepenedBy).toEqual([
      { cardId: SECOND_CARD, term: 'Transfer Syntax, implicit VR', missionNumber: '1.2', state: 'hidden' },
    ])
    expect(second?.deepens).toEqual({
      cardId: FIRST_CARD,
      term: 'Transfer Syntax',
      missionNumber: '1.1',
      state: 'hidden',
    })
    expect(second?.deepenedBy).toEqual([])
  })

  it('says what the player can now do only once every mission of the stage is completed', () => {
    const one = completed(startMission(emptyProgress(), EXAMPLE_MISSION.id, 1), EXAMPLE_MISSION.id)
    expect(codexView(one, content).chapters[0]).toMatchObject({ finished: false, youCanNow: [], filed: 1 })
    const both = completed(startMission(one, FOLLOW_UP_MISSION.id, 2), FOLLOW_UP_MISSION.id)
    expect(codexView(both, content).chapters[0]).toMatchObject({
      finished: true,
      youCanNow: ['find the four regions of a Part 10 file', 'read the Transfer Syntax UID'],
    })
  })

  it('puts every found card in the glossary, alphabetically, and none still hidden', () => {
    const both = startMission(startMission(emptyProgress(), FOLLOW_UP_MISSION.id, 1), EXAMPLE_MISSION.id, 2)
    expect(codexView(both, content).glossary.map((entry) => entry.term)).toEqual([
      'Transfer Syntax',
      'Transfer Syntax, implicit VR',
    ])
    const one = startMission(emptyProgress(), FOLLOW_UP_MISSION.id, 1)
    expect(codexView(one, content).glossary.map((entry) => entry.cardId)).toEqual([SECOND_CARD])
  })
})

describe('collectCodex', () => {
  it('lists the filed cards in the order their missions were completed', () => {
    const progress = completed(
      completed(
        startMission(startMission(emptyProgress(), EXAMPLE_MISSION.id, 1), FOLLOW_UP_MISSION.id, 2),
        FOLLOW_UP_MISSION.id
      ),
      EXAMPLE_MISSION.id
    )
    expect(collectCodex(progress, content).map((entry) => entry.card.id)).toEqual([SECOND_CARD, FIRST_CARD])
  })
})
