import {
  FIRST_MISSION,
  JOURNEY_SKILLS,
  journeyFixture,
  longerJourneyFixture,
  SECOND_MISSION,
} from '@features/map/utils/fixtures'
import { describe, expect, it } from 'vitest'
import { PLANNED_PROGRESS } from './journey.constants'
import {
  chapterTitleOf,
  currentChapter,
  journeyChapters,
  journeyMarks,
  journeyStops,
  journeySummary,
  kickerOf,
  markStateOf,
  toneOf,
} from './journey.util'

describe('journeyChapters', () => {
  it('keeps the six stages and the Bridge in play order, the ones with no missions as planned', () => {
    const chapters = journeyChapters(journeyFixture(), FIRST_MISSION)
    expect(chapters.map((chapter) => chapter.prefix)).toEqual(['1', '2', '3', 'B', '4', '5', '6'])
    const planned = chapters.filter((chapter) => chapter.planned)
    expect(planned).toHaveLength(6)
    expect(planned.every((chapter) => chapter.tone === 'planned' && chapter.progress === PLANNED_PROGRESS)).toBe(true)
    expect(planned.every((chapter) => chapter.stops.length === 0 && !chapter.hasHere)).toBe(true)
    expect(chapters[1]).toMatchObject({ id: 'the-elements', kicker: 'Stage 2 of 6', name: 'The elements' })
    expect(chapters[1]?.summary).toContain('Planned: no missions yet.')
  })

  it('names the Bridge by its label, never a stage number, and says where it stands', () => {
    const bridge = journeyChapters(journeyFixture(), FIRST_MISSION)[3]
    expect(bridge).toMatchObject({
      prefix: 'B',
      heading: 'Bridge',
      title: 'Bridge',
      kicker: 'Between stages 3 and 4',
    })
    expect(bridge?.summary).toBe('Bridge. The same SOP Instance UID on disk and on the wire. Planned: no missions yet.')
    expect(bridge?.marks[0]).toMatchObject({ number: 'B', heading: 'Bridge' })
  })

  it('turns a mission into a stop, numbered by its stage and its place in it', () => {
    const chapter = journeyChapters(journeyFixture('available'), FIRST_MISSION)[0]
    expect(chapter).toMatchObject({ planned: false, total: 1, done: 0, tone: 'progress', progress: '0 of 1 passed' })
    expect(chapter?.stops[0]).toMatchObject({
      key: 'what-the-file-says',
      number: '1.1',
      title: 'What the File Says',
      heading: 'Stage 1',
      chapterId: 'the-first-file',
      state: 'available',
      playable: true,
      summary: FIRST_MISSION.objective,
    })
  })

  it('says each status in words and draws it in its own shape', () => {
    const stop = (status: Parameters<typeof journeyFixture>[0]) =>
      journeyChapters(journeyFixture(status), null)[0]?.stops[0]
    expect(stop('locked')).toMatchObject({ state: 'locked', status: 'locked', playable: false })
    expect(stop('available')).toMatchObject({ state: 'available', status: 'available', playable: true })
    expect(stop('in_progress')).toMatchObject({ state: 'progress', status: 'in progress', playable: true })
    expect(stop('completed')).toMatchObject({ state: 'clean', status: 'done, first try', playable: true })
  })

  it('tells a mission done with hints, or after more than one judged attempt, from one done first try', () => {
    expect(markStateOf('completed', 1, 0)).toBe('clean')
    expect(markStateOf('completed', 3, 0)).toBe('done')
    expect(markStateOf('completed', 1, 2)).toBe('helped')
    expect(markStateOf('in_progress', 3, 2)).toBe('progress')
  })

  it('gives a stage with no missions one planned stop that keeps its place on the road', () => {
    const chapters = journeyChapters(journeyFixture(), FIRST_MISSION)
    expect(chapters[1]?.marks).toEqual([
      expect.objectContaining({
        key: 'planned:the-elements',
        planned: true,
        number: '2',
        state: 'locked',
        status: 'not built yet',
        playable: false,
        here: false,
      }),
    ])
    expect(chapters[0]?.marks).toBe(chapters[0]?.stops)
    expect(journeyMarks(chapters).map((stop) => stop.number)).toEqual(['1.1', '2', '3', 'B', '4', '5', '6'])
    expect(journeyStops(chapters).map((stop) => stop.number)).toEqual(['1.1'])
  })

  it('lists the parts of the standard each stage works with', () => {
    const chapters = journeyChapters(journeyFixture(), FIRST_MISSION)
    expect(chapters.every((chapter) => chapter.parts.length > 0)).toBe(true)
    expect(chapters[0]?.parts).toEqual(['PS3.10', 'PS3.5'])
    expect(chapters[4]?.parts).toEqual(['PS3.8', 'PS3.7'])
  })

  it('flags the mission Continue goes to, and only that one', () => {
    const chapters = journeyChapters(longerJourneyFixture(true), SECOND_MISSION)
    const stops = journeyStops(chapters)
    expect(stops.map((stop) => stop.here)).toEqual([false, true])
    expect(stops[1]?.status).toBe('available, you are here')
    expect(chapters.filter((chapter) => chapter.hasHere).map((chapter) => chapter.prefix)).toEqual(['1'])
    expect(journeyStops(journeyChapters(journeyFixture('completed'), null)).some((stop) => stop.here)).toBe(false)
  })

  it('counts progress and carries attempts and hints', () => {
    const chapter = journeyChapters(longerJourneyFixture(true), SECOND_MISSION)[0]
    expect(chapter).toMatchObject({ done: 1, total: 2, progress: '1 of 2 passed', tone: 'progress' })
    expect(chapter?.stops[0]).toMatchObject({ attempts: 3, hintsUsed: 2 })
    expect(journeyChapters(journeyFixture('completed'), null)[0]).toMatchObject({
      tone: 'passed',
      progress: '1 of 1 passed',
    })
  })

  it('names the skills a mission needs, whether a completed mission has earned each, and which one earns it', () => {
    const locked = journeyStops(journeyChapters(longerJourneyFixture(false), FIRST_MISSION, JOURNEY_SKILLS))[1]
    expect(locked?.needs).toEqual([
      {
        id: 'name-the-elements',
        title: 'Name the elements go-dicom prints',
        met: false,
        earnedIn: 'What the File Says',
      },
    ])
    const open = journeyStops(journeyChapters(longerJourneyFixture(true), SECOND_MISSION))[1]
    expect(open?.needs[0]?.met).toBe(true)
  })

  it('carries the skills a mission earns, its time and its Codex cards', () => {
    const [first, second] = journeyStops(journeyChapters(longerJourneyFixture(true), SECOND_MISSION, JOURNEY_SKILLS))
    expect(first).toMatchObject({
      skills: JOURNEY_SKILLS,
      minutes: 15,
      codex: [{ id: 'data-set', term: 'Data Set' }],
      regionId: 'open-the-file',
    })
    // A skill the tree doesn't list is named by its id; a mission that gives no time has none.
    expect(second).toMatchObject({ skills: [{ id: 'read-the-bytes', title: 'read-the-bytes' }], minutes: null })
  })

  it("groups a stage's missions in its regions, each with its own progress", () => {
    const chapter = journeyChapters(longerJourneyFixture(true), SECOND_MISSION)[0]
    expect(chapter?.regions).toEqual([
      expect.objectContaining({
        key: 'the-first-file/open-the-file',
        name: 'Open the file',
        guide: 'The Preamble',
        done: 1,
        tone: 'progress',
        progress: 'in progress · 1 of 2',
      }),
    ])
    expect(chapter?.regions[0]?.stops).toEqual(chapter?.stops)
    expect(journeyChapters(journeyFixture('completed'), null)[0]?.regions[0]?.progress).toBe('passed · 1 of 1')
    expect(journeyChapters(journeyFixture('locked'), null)[0]?.regions[0]?.progress).toBe('ahead · 0 of 1')
    expect(journeyChapters(journeyFixture(), null)[1]?.regions).toEqual([])
  })

  it("names a stop by the first skill its mission earns in the Skills view, else by the mission's title", () => {
    const skills = journeyStops(journeyChapters(longerJourneyFixture(true), SECOND_MISSION, JOURNEY_SKILLS, 'skills'))
    expect(skills.map((stop) => stop.title)).toEqual(['Read what a DICOM file holds with go-dicom', 'read-the-bytes'])
    const missions = journeyStops(journeyChapters(longerJourneyFixture(true), SECOND_MISSION, JOURNEY_SKILLS))
    expect(missions.map((stop) => stop.title)).toEqual([FIRST_MISSION.title, SECOND_MISSION.title])
  })

  it('is empty before the content is loaded', () => {
    expect(journeyChapters([], null)).toEqual([])
  })
})

describe('chapterTitleOf and kickerOf', () => {
  it('names a stage by its heading and title, and a labelled chapter once', () => {
    expect(chapterTitleOf({ heading: 'Stage 2', title: 'The elements' })).toBe('Stage 2: The elements')
    expect(chapterTitleOf({ heading: 'Bridge', title: 'Bridge' })).toBe('Bridge')
  })

  it('counts only numbered stages, and places a labelled chapter between them', () => {
    expect(kickerOf({ heading: 'Stage 4', stage: 4 }, 6)).toBe('Stage 4 of 6')
    expect(kickerOf({ heading: 'Bridge' }, 6, { before: 3, after: 4 })).toBe('Between stages 3 and 4')
    expect(kickerOf({ heading: 'Bridge' }, 6, { before: 6 })).toBe('After stage 6')
    expect(kickerOf({ heading: 'Bridge' }, 6, { after: 1 })).toBe('Before stage 1')
    expect(kickerOf({ heading: 'Bridge' }, 0)).toBe('Bridge')
  })
})

describe('toneOf', () => {
  it('reads a stage from its stops', () => {
    expect(toneOf([])).toBe('planned')
    expect(toneOf([{ state: 'locked' }, { state: 'locked' }])).toBe('ahead')
    expect(toneOf([{ state: 'done' }, { state: 'locked' }])).toBe('progress')
    expect(toneOf([{ state: 'done' }, { state: 'done' }])).toBe('passed')
  })
})

describe('journeySummary', () => {
  it('reports the stage the player is in and how many are still planned', () => {
    const chapters = journeyChapters(journeyFixture(), FIRST_MISSION)
    expect(currentChapter(chapters)?.prefix).toBe('1')
    expect(journeySummary(chapters)).toBe('Stage 1, The First File: 0 of 1 mission passed · 6 stages planned')
    expect(journeySummary(journeyChapters(longerJourneyFixture(true), SECOND_MISSION))).toBe(
      'Stage 1, The First File: 1 of 2 missions passed · 6 stages planned'
    )
    expect(journeySummary([])).toBe('The journey is not loaded yet')
  })
})
