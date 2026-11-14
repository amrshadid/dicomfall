import { FIRST_MISSION, journeyFixture, longerJourneyFixture, SECOND_MISSION } from '@features/map/utils/fixtures'
import { journeyChapters, journeyStops, plannedKeyOf, plannedStopOf } from '@features/map/utils/journey'
import { layoutMap } from '@features/map/utils/layout'
import { describe, expect, it } from 'vitest'
import { NOTE_STATES, PLANNED_NOTE } from './map-note.constants'
import { mapNotesOf, noteOf, sameTarget, stopStateOf, targetAt } from './map-note.util'

const chapters = journeyChapters(journeyFixture(), FIRST_MISSION)
const notes = mapNotesOf(chapters)

describe('mapNotesOf', () => {
  it('explains a mission by its objective, its state, its time and its guide', () => {
    expect(notes.stops.get(FIRST_MISSION.id)).toEqual({
      title: '1.1 · What the File Says',
      text: FIRST_MISSION.objective,
      facts: ['Next up', 'About 15 min', 'Guide: The Preamble'],
    })
  })

  it('explains a region by what its missions cover, its place in go-dicom and the standard, its guide and its progress', () => {
    expect(notes.regions.get('the-first-file/open-the-file')).toEqual({
      title: 'Open the file',
      text: 'What its missions cover: what a DICOM file holds, read with go-dicom and as bytes. In go-dicom and the standard: cli/show.go, cli/info.go, PS3.10 §7.',
      facts: ['Guide: The Preamble', '0 of 1 passed'],
    })
  })

  it('explains the planned stop of a stage with no missions by the stage itself', () => {
    expect(notes.stops.get(plannedKeyOf('the-association'))).toEqual({
      title: 'Stage 4 · The association',
      text: `Application entities, AE titles, SCU and SCP roles, and presentation contexts. ${PLANNED_NOTE}`,
      facts: ['Not built yet', 'Standard parts: PS3.8, PS3.7'],
    })
    expect(notes.stops.get(plannedKeyOf('the-bridge'))?.title).toBe('Bridge')
  })

  it('says what every stage covers, and that a planned one has no missions yet', () => {
    expect(notes.chapters.size).toBe(7)
    expect(notes.chapters.get('the-first-file')).toEqual({
      title: 'What this stage covers · The First File',
      text: 'What a DICOM file holds, read with go-dicom and as bytes, and its four regions.',
      facts: ['Stage 1 of 6', '0 of 1 passed', 'Standard parts: PS3.10, PS3.5'],
    })
    const planned = notes.chapters.get('the-association')
    expect(planned?.text.endsWith(PLANNED_NOTE)).toBe(true)
    expect(planned?.facts).toEqual(['Stage 4 of 6', 'Planned: no missions yet', 'Standard parts: PS3.8, PS3.7'])
    expect(notes.chapters.get('the-bridge')?.facts[0]).toBe('Between stages 3 and 4')
  })
})

describe('stopStateOf', () => {
  it('names what a locked mission waits for', () => {
    const [first, second] = journeyStops(journeyChapters(longerJourneyFixture(false), FIRST_MISSION))
    if (!first || !second) {
      throw new Error('the fixture has two missions')
    }
    expect(stopStateOf(first)).toBe(NOTE_STATES.progress)
    expect(stopStateOf(second)).toBe('Locked: finish What the File Says first')
    const [done, open] = journeyStops(journeyChapters(longerJourneyFixture(true), null))
    // The fixture's first mission took hints.
    expect(done && stopStateOf(done)).toBe(NOTE_STATES.helped)
    expect(done && stopStateOf({ ...done, state: 'clean' })).toBe(NOTE_STATES.clean)
    expect(done && stopStateOf({ ...done, state: 'done' })).toBe(NOTE_STATES.done)
    expect(
      stopStateOf(
        plannedStopOf({
          id: 'the-first-file',
          stage: 1,
          heading: 'Stage 1',
          numberPrefix: '1',
          title: 'The First File',
          summary: '',
          outcomes: [],
          regions: [],
        })
      )
    ).toBe(NOTE_STATES.planned)
    expect(open && stopStateOf(open)).toBe(NOTE_STATES.available)
    expect(open && stopStateOf({ ...open, here: true })).toBe(NOTE_STATES.next)
    expect(stopStateOf({ ...second, needs: [] })).toBe(NOTE_STATES.lockedUnknown)
  })
})

describe('noteOf', () => {
  it('answers for the target, else for the stage in view', () => {
    expect(noteOf({ kind: 'stop', key: FIRST_MISSION.id }, notes, 'the-elements')?.title).toMatch(/^1\.1 · /)
    expect(noteOf({ kind: 'chapter', id: 'query-and-retrieve' }, notes, null)?.title).toBe(
      'What this stage covers · Query and retrieve'
    )
    expect(noteOf(null, notes, 'the-elements')?.title).toBe('What this stage covers · The elements')
    expect(noteOf({ kind: 'stop', key: SECOND_MISSION.id }, notes, null)).toBeUndefined()
    expect(noteOf({ kind: 'region', key: 'the-first-file/open-the-file' }, notes, null)?.title).toBe('Open the file')
  })
})

describe('sameTarget', () => {
  it('compares by kind and name', () => {
    expect(sameTarget(null, null)).toBe(true)
    expect(sameTarget(null, { kind: 'stop', key: 'a' })).toBe(false)
    expect(sameTarget({ kind: 'stop', key: 'a' }, { kind: 'stop', key: 'a' })).toBe(true)
    expect(sameTarget({ kind: 'stop', key: 'a' }, { kind: 'chapter', id: 'a' })).toBe(false)
    expect(sameTarget({ kind: 'chapter', id: 'a' }, { kind: 'chapter', id: 'b' })).toBe(false)
    expect(sameTarget({ kind: 'region', key: 'a' }, { kind: 'stop', key: 'a' })).toBe(false)
    expect(sameTarget({ kind: 'region', key: 'a' }, { kind: 'region', key: 'a' })).toBe(true)
  })
})

describe('targetAt', () => {
  it('finds the region band, else the stage, at a drawing height, and nothing under the last one', () => {
    const scene = layoutMap(chapters, 774)
    const first = scene.chapters[0]
    const region = first?.regions[0]
    expect(targetAt(scene.chapters, (first?.top ?? 0) + 4)).toEqual({ kind: 'chapter', id: 'the-first-file' })
    expect(targetAt(scene.chapters, (region?.top ?? 0) + 4)).toEqual({
      kind: 'region',
      key: 'the-first-file/open-the-file',
    })
    expect(targetAt(scene.chapters, scene.height)).toBeNull()
  })
})
