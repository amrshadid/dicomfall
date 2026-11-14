import type { ChapterDefinition, ChapterEntry, MissionDefinition } from '@dicomfall/game/types'
import { hrefOf } from '@shared/navigation'
import { describe, expect, it, vi } from 'vitest'
import {
  continueTargetOf,
  currentChapter,
  firstMissionOf,
  lastPlayedText,
  titleContentsOf,
  volumeOf,
} from './title-contents.util'

// No mission content exists yet: a two-stage journey with just the fields these functions read.
const firstFile = { id: 'the-first-file', stage: 1, heading: 'Stage 1', title: 'The first file' } as ChapterDefinition
const archive = { id: 'the-archive', stage: 2, heading: 'Stage 2', title: 'The archive' } as ChapterDefinition
const mission = {
  id: 'the-missing-instance',
  chapter: 'the-archive',
  title: 'The Missing Instance',
  objective: 'One sentence.',
} as MissionDefinition

/** The journey, its one mission with the given status. */
const chaptersWith = (status: 'available' | 'in_progress' | 'completed'): ChapterEntry[] => [
  { chapter: firstFile, missions: [] },
  { chapter: archive, missions: [{ mission, status, attempts: 0, hintsUsed: 0 }] },
]

describe('titleContentsOf', () => {
  it('lists New game, then the map with the stage progress, and Settings', () => {
    const onNewGame = vi.fn()
    const contents = titleContentsOf({
      chapter: currentChapter(chaptersWith('completed'), mission),
      firstMission: mission,
      onNewGame,
    })
    expect(contents.map((entry) => entry.id)).toEqual(['new', 'map', 'settings'])
    expect(contents[0]?.reference).toBe('from The Missing Instance')
    expect(contents[1]).toMatchObject({ reference: 'Stage 2, 1 of 1 passed', href: hrefOf({ name: 'map' }) })
    contents[0]?.onSelect?.()
    expect(onNewGame).toHaveBeenCalledOnce()
  })

  it('still names the journey before any content', () => {
    const contents = titleContentsOf({ chapter: undefined, firstMission: undefined, onNewGame: () => {} })
    expect(contents[1]?.reference).toBe('the journey')
  })
})

describe('the stage the player is in', () => {
  it('is the chapter of the mission to continue, else the first with missions', () => {
    const chapters = chaptersWith('available')
    expect(currentChapter(chapters, mission)?.chapter.id).toBe('the-archive')
    expect(currentChapter(chapters, null)?.chapter.id).toBe('the-archive')
    expect(currentChapter([], null)).toBeUndefined()
    expect(volumeOf(currentChapter(chapters, mission))).toBe('Stage 2: The archive')
    expect(volumeOf(undefined)).toBe('The journey')
  })
})

describe('continueTargetOf', () => {
  it('links to the mission and says where it is and how far', () => {
    const target = continueTargetOf({
      mission,
      chapters: chaptersWith('in_progress'),
      lastPlayed: ' · last played just now',
    })
    expect(target.href).toBe(hrefOf({ name: 'mission', missionId: mission.id }))
    expect(target.where).toBe('Stage 2 · The archive · The Missing Instance')
    expect(target.step).toBe('In progress · last played just now')
  })
})

describe('firstMissionOf', () => {
  it('says where New game starts, with the mission in one sentence', () => {
    expect(firstMissionOf(mission)).toEqual({ where: 'Start at The Missing Instance.', step: 'One sentence.' })
    expect(firstMissionOf(undefined)).toEqual({
      where: 'No mission is written yet.',
      step: 'The journey is on the Archive Map.',
    })
  })
})

describe('lastPlayedText', () => {
  it('is empty before the first save', () => {
    expect(lastPlayedText(1000, null)).toBe('')
    expect(lastPlayedText(1000, 1000)).toBe(' · last played just now')
  })
})
