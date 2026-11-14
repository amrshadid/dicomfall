import { describe, expect, it } from 'vitest'
import { EXAMPLE_MISSION, exampleContent, FOLLOW_UP_MISSION } from '#test/index'
import {
  closeDebrief,
  continueMission,
  emptyProgress,
  findMissionProgress,
  missionList,
  missionStatus,
  openDebrief,
  openDebriefOf,
  progressSkills,
  recordAttempt,
  replayMission,
  revealNextHint,
  startMission,
} from '#utils/progress/progress.util'

const MISSION = EXAMPLE_MISSION
const ID = MISSION.id

interface Attempt {
  readonly passed: boolean
  readonly at: number
}

const attempt = (passed: boolean, at: number): Attempt => ({ passed, at })

const started = () => startMission(emptyProgress(), ID, 100)

/** The progress after `attempts`, which must all be recordable. */
function after(...attempts: readonly Attempt[]) {
  return attempts.reduce((progress, { passed, at }) => recordAttempt(progress, ID, passed, at) ?? progress, started())
}

describe('starting a mission', () => {
  it('adds its record once and makes it where "Continue" goes', () => {
    const progress = startMission(startMission(started(), FOLLOW_UP_MISSION.id, 200), ID, 300)
    expect(progress.missions.map((record) => [record.missionId, record.firstStartedAt])).toEqual([
      [ID, 100],
      [FOLLOW_UP_MISSION.id, 200],
    ])
    expect(progress.lastActive).toBe(ID)
  })
})

describe('mission status', () => {
  it('goes from available to in progress to completed, and unlocks what needed it', () => {
    const content = exampleContent()
    expect(missionStatus(emptyProgress(), MISSION, content)).toBe('available')
    expect(missionStatus(emptyProgress(), FOLLOW_UP_MISSION, content)).toBe('locked')
    expect(missionStatus(started(), MISSION, content)).toBe('in_progress')
    expect(progressSkills(emptyProgress(), content)).toEqual(new Set())

    const completed = after(attempt(true, 500))
    expect(missionStatus(completed, MISSION, content)).toBe('completed')
    // The follow-up needs the skill the first mission earns.
    expect(progressSkills(completed, content)).toEqual(new Set(MISSION.skills))
    expect(missionStatus(completed, FOLLOW_UP_MISSION, content)).toBe('available')
  })

  it('lists every chapter, with attempts and hints used per mission', () => {
    const hinted = revealNextHint(after(attempt(false, 500)), MISSION) ?? started()
    const list = missionList(hinted, exampleContent())
    expect(list.map((entry) => [entry.chapter.id, entry.missions.length])).toEqual([
      ['the-first-file', 2],
      ['the-elements', 0],
    ])
    expect(list[0]?.missions).toMatchObject([
      { mission: MISSION, status: 'in_progress', attempts: 1, hintsUsed: 1 },
      { mission: FOLLOW_UP_MISSION, status: 'locked', attempts: 0, hintsUsed: 0 },
    ])
  })

  it('continues the mission last played, else the first one open', () => {
    const content = exampleContent()
    expect(continueMission(emptyProgress(), content)).toBe(MISSION)
    expect(continueMission(started(), content)).toBe(MISSION)
    const completed = after(attempt(true, 500))
    expect(continueMission(completed, content)).toBe(FOLLOW_UP_MISSION)
    const all = recordAttempt(startMission(completed, FOLLOW_UP_MISSION.id, 600), FOLLOW_UP_MISSION.id, true, 700)
    expect(all && continueMission(all, content)).toBeNull()
  })
})

describe('revealing hints', () => {
  it("reveals one more of the mission's hints each time, until none is left", () => {
    let progress = started()
    for (const expected of [1, 2, 3]) {
      progress = revealNextHint(progress, MISSION) ?? progress
      expect(findMissionProgress(progress, ID)?.hintsRevealed).toBe(expected)
    }
    expect(revealNextHint(progress, MISSION)).toBeNull()
  })

  it('reveals nothing for a mission not started', () => {
    expect(revealNextHint(emptyProgress(), MISSION)).toBeNull()
  })
})

describe('replaying a mission', () => {
  it('puts every hint back and closes its debrief, keeping completion and attempts', () => {
    const completed = after(attempt(false, 400), attempt(true, 500))
    const hinted = revealNextHint(revealNextHint(completed, MISSION) ?? completed, MISSION) ?? completed
    const open = openDebrief(hinted, ID, null)

    const replayed = replayMission(open, ID)

    const before = findMissionProgress(open, ID)
    expect(findMissionProgress(replayed, ID)).toEqual({ ...before, hintsRevealed: 0 })
    expect(replayed.debrief).toBeUndefined()
    expect(replayed.completionOrder).toEqual([ID])
    expect(replayed.lastActive).toBe(ID)
  })

  it('leaves a mission never started alone', () => {
    const progress = emptyProgress()
    expect(replayMission(progress, ID)).toBe(progress)
  })
})

describe('recording attempts', () => {
  it('counts each attempt and completes the mission the first time one passes', () => {
    const progress = after(attempt(false, 300), attempt(true, 400), attempt(true, 500))
    expect(findMissionProgress(progress, ID)).toMatchObject({ attempts: 3, completedAt: 400 })
    expect(progress.completionOrder).toEqual([ID])
  })

  it('never takes a completion back when a later attempt fails', () => {
    const progress = after(attempt(true, 400), attempt(false, 500))
    expect(missionStatus(progress, MISSION, exampleContent())).toBe('completed')
    expect(findMissionProgress(progress, ID)).toMatchObject({ attempts: 2, completedAt: 400 })
  })

  it('records nothing for a mission that was not started', () => {
    expect(recordAttempt(emptyProgress(), ID, true, 1)).toBeNull()
  })
})

describe('the open debrief', () => {
  const ID = EXAMPLE_MISSION.id
  const verdict = { passed: true, objectives: [] }
  const started = startMission(emptyProgress(), ID, 0)
  const completed = { ...started, completionOrder: [ID] }

  it('is opened for a mission, and read back only for that mission once it is completed', () => {
    const open = openDebrief(completed, ID, verdict)
    expect(openDebriefOf(open, ID)).toEqual({ missionId: ID, verdict })
    expect(openDebriefOf(open, FOLLOW_UP_MISSION.id)).toBeUndefined()
    expect(openDebriefOf(openDebrief(started, ID, verdict), ID)).toBeUndefined()
  })

  it('is closed without a trace, and closing none changes nothing', () => {
    expect(closeDebrief(openDebrief(completed, ID, verdict))).toEqual(completed)
    expect('debrief' in closeDebrief(openDebrief(completed, ID, verdict))).toBe(false)
    expect(closeDebrief(completed)).toBe(completed)
  })
})
