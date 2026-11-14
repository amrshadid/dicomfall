import { FIRST_MISSION, journeyFixture, longerJourneyFixture, SECOND_MISSION } from '@features/map/utils/fixtures'
import { journeyChapters } from '@features/map/utils/journey'
import { describe, expect, it } from 'vitest'
import { OVERVIEW_HERE_AT } from './map-layout.constants'
import { layoutMap } from './map-layout.util'
import { overviewDescription, overviewWindow } from './map-overview.util'

// "You" deep in the journey, at stage 4, so the window has drawing above and below it.
const source = journeyFixture()
const firstStage = source[0]?.missions ?? []
const deeper = source.map((entry) => {
  if (entry.chapter.id === 'the-first-file') {
    return { ...entry, chapter: { ...entry.chapter, regions: [] }, missions: [] }
  }
  return entry.chapter.id === 'the-association' ? { ...entry, missions: firstStage } : entry
})

describe('overviewWindow', () => {
  const scene = layoutMap(journeyChapters(deeper, FIRST_MISSION), 460, 'overview')

  it('puts "you" a little above the middle and fades the edges that hide more drawing', () => {
    const shown = overviewWindow(scene, 400)
    expect(shown.top).toBe(Math.round((scene.here?.y ?? 0) - 400 * OVERVIEW_HERE_AT))
    expect(shown).toMatchObject({ height: 400, fadeTop: true, fadeBottom: true })
  })

  it('starts at the top of the sheet when the player stands nowhere', () => {
    const nowhere = layoutMap(journeyChapters(journeyFixture('completed'), null), 460, 'overview')
    expect(overviewWindow(nowhere, 400)).toMatchObject({ top: 0, fadeTop: false, fadeBottom: true })
  })

  it('shows the whole drawing, unfaded, in a window taller than it', () => {
    expect(overviewWindow(scene, scene.height + 100)).toEqual({
      top: 0,
      height: scene.height,
      fadeTop: false,
      fadeBottom: false,
    })
  })
})

describe('overviewDescription', () => {
  it('says where the player stands, in which stage, and what comes next', () => {
    expect(overviewDescription(journeyChapters(journeyFixture(), FIRST_MISSION))).toBe(
      'You are at 1.1 What the File Says, in Stage 1, The First File. Open the Archive Map.'
    )
    expect(overviewDescription(journeyChapters(longerJourneyFixture(false), FIRST_MISSION))).toBe(
      'You are at 1.1 What the File Says, in Stage 1, The First File; next: 1.2 Under the Words. Open the Archive Map.'
    )
    expect(overviewDescription(journeyChapters(longerJourneyFixture(true), SECOND_MISSION))).toBe(
      'You are at 1.2 Under the Words, in Stage 1, The First File. Open the Archive Map.'
    )
  })

  it('says so when everything built is done, and when nothing is built', () => {
    expect(overviewDescription(journeyChapters(journeyFixture('completed'), null))).toBe(
      'Every mission built so far is done. Open the Archive Map to replay one.'
    )
    expect(overviewDescription([])).toContain('no mission is built yet')
  })
})
