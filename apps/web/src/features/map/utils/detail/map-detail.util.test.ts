import {
  FIRST_MISSION,
  JOURNEY_SKILLS,
  journeyFixture,
  longerJourneyFixture,
  SECOND_MISSION,
} from '@features/map/utils/fixtures'
import { journeyChapters, journeyMarks, journeyStops } from '@features/map/utils/journey'
import { describe, expect, it } from 'vitest'
import { PLAN_NOTES, TYPICAL_MISSION_TIME } from './map-detail.constants'
import { lockNoteOf, mapDetailOf, missionTimeOf, playLabelOf } from './map-detail.util'

function detailOf(source: ReturnType<typeof journeyFixture>, next: { id: string } | null, at = 0) {
  const chapters = journeyChapters(source, next, JOURNEY_SKILLS)
  const stop = journeyStops(chapters)[at]
  if (!stop) {
    throw new Error('the fixture has no such stop')
  }
  return mapDetailOf(stop, chapters)
}

describe('mapDetailOf', () => {
  it('says everything about an open mission and links to it', () => {
    expect(detailOf(journeyFixture('available'), FIRST_MISSION)).toEqual({
      place: 'Stage 1 · The First File · Open the file · 1.1',
      title: 'What the File Says',
      state: 'available',
      planned: false,
      status: 'Available, you are here',
      about: { term: 'Objective', text: FIRST_MISSION.objective },
      skills: JOURNEY_SKILLS,
      needs: [],
      time: 'About 15 min',
      attempts: 'None yet',
      hints: 'None',
      parts: ['PS3.10', 'PS3.5'],
      codex: [{ id: 'data-set', term: 'Data Set', href: '#/codex/data-set' }],
      play: { label: 'Play', href: '#/mission/what-the-file-says' },
      note: null,
    })
  })

  it('gives a mission without its own estimate the typical time', () => {
    expect(detailOf(longerJourneyFixture(true), SECOND_MISSION, 1).time).toBe(TYPICAL_MISSION_TIME)
    expect(missionTimeOf({ minutes: 10 })).toBe('About 10 min')
  })

  it('counts attempts and hints in words', () => {
    expect(detailOf(journeyFixture('in_progress', 1, 1), FIRST_MISSION)).toMatchObject({
      attempts: '1 judged attempt',
      hints: '1 hint',
      play: { label: 'Continue' },
    })
    expect(detailOf(longerJourneyFixture(true), SECOND_MISSION)).toMatchObject({
      state: 'helped',
      status: 'Done with help',
      attempts: '3 judged attempts',
      hints: '2 hints',
      play: { label: 'Replay' },
    })
    expect(detailOf(journeyFixture('completed', 1), null)).toMatchObject({ state: 'clean', status: 'Done, first try' })
    expect(detailOf(journeyFixture('completed', 4), null)).toMatchObject({ state: 'done', status: 'Done' })
  })

  it('heads the planned stop of a stage with no missions by the stage, with what it covers and no action', () => {
    const chapters = journeyChapters(journeyFixture(), FIRST_MISSION)
    const stop = journeyMarks(chapters)[1]
    expect(stop && mapDetailOf(stop, chapters)).toEqual({
      place: 'Stage 2 of 6',
      title: 'The elements',
      state: 'locked',
      planned: true,
      status: 'Not built yet',
      about: { term: 'Covers', text: 'Tags, Value Representation, value length and multiplicity, and sequences.' },
      parts: ['PS3.5'],
      skills: [],
      needs: null,
      time: null,
      attempts: null,
      hints: null,
      codex: [],
      play: null,
      note: PLAN_NOTES.planned,
    })
  })

  it('heads the Bridge by where it stands, never by a stage number', () => {
    const chapters = journeyChapters(journeyFixture(), FIRST_MISSION)
    const stop = journeyMarks(chapters)[3]
    expect(stop && mapDetailOf(stop, chapters)).toMatchObject({ place: 'Between stages 3 and 4', title: 'Bridge' })
  })

  it('gives a locked mission no link, and names what to complete first', () => {
    const detail = detailOf(longerJourneyFixture(false), FIRST_MISSION, 1)
    expect(detail.play).toBeNull()
    expect(detail.status).toBe('Locked')
    expect(detail.note).toBe('Locked: complete What the File Says first.')
    expect(detail.needs).toEqual([
      {
        id: 'name-the-elements',
        title: 'Name the elements go-dicom prints',
        met: false,
        earnedIn: FIRST_MISSION.title,
      },
    ])
  })
})

describe('the small parts', () => {
  it('labels the action by the state', () => {
    expect(playLabelOf({ state: 'available' })).toBe('Play')
    expect(playLabelOf({ state: 'progress' })).toBe('Continue')
    expect(playLabelOf({ state: 'done' })).toBe('Replay')
    expect(playLabelOf({ state: 'clean' })).toBe('Replay')
    expect(playLabelOf({ state: 'helped' })).toBe('Replay')
  })

  it('explains a lock with no known cause in plain words', () => {
    expect(lockNoteOf({ playable: false, needs: [], planned: false })).toBe(PLAN_NOTES.locked)
    expect(lockNoteOf({ playable: true, needs: [], planned: false })).toBeNull()
  })
})
