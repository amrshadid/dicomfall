import type { ChapterDefinition, GameContent, MissionDefinition, Progress } from '@dicomfall/game/types'
import { createGameContent } from '@dicomfall/game/utils'
import type { CodexCardData } from '@shared/types'

// Made up to lay screens out and test them: mission text comes from the missions package, checked on the Machine.

export const DEBRIEF_LEARNED: readonly string[] = ['the preamble', 'the `DICM` prefix', 'File Meta Information']

export const DEBRIEF_CARDS: readonly CodexCardData[] = [
  {
    id: 'preamble',
    term: 'the preamble',
    simple: 'The first 128 bytes of a Part 10 file, free for other uses and often all zero.',
    deep: null,
    sources: [{ path: 'filereader/filereader.go', href: 'https://example.invalid/filereader/filereader.go' }],
    docs: null,
    tryIt: 'go-dicom show ct.dcm',
    deepens: null,
    deepenedBy: [],
    filedIn: '1.1 The Four Regions',
  },
  {
    id: 'dicm-prefix',
    term: 'the DICM prefix',
    simple: 'Four letters after the preamble that say this is a DICOM file.',
    deep: null,
    sources: [],
    docs: null,
    tryIt: null,
    deepens: null,
    deepenedBy: [],
    filedIn: '1.1 The Four Regions',
  },
]

export const DEBRIEF_CHAPTER: ChapterDefinition = {
  id: 'the-first-file',
  stage: 1,
  heading: 'Stage 1',
  numberPrefix: '1',
  title: 'The First File',
  summary: 'Open one file and find its four regions.',
  story: 'One CT file waits on the disk. Before it goes anywhere, find what is in it.',
  guide: 'The Preamble',
  standsFor: 'Part 10, the file format',
  outcomes: ['Find the four regions of a Part 10 file.'],
  regions: [
    {
      id: 'open-the-file',
      name: 'Open the file',
      caption: 'the preamble, the prefix, the meta and the Data Set',
      guide: 'The Preamble',
      source: 'filereader/, PS3.10',
      missions: ['the-four-regions'],
    },
  ],
}

/** One mission of one stage, with two cards: enough for the debrief's card, cards and stage block. */
export const DEBRIEF_MISSION: MissionDefinition = {
  id: 'the-four-regions',
  version: 1,
  title: 'The Four Regions',
  chapter: 'the-first-file',
  objective: 'Find the four regions of ct.dcm.',
  skills: [],
  prerequisites: [],
  teaches: [],
  names: [],
  uses: [],
  lab: {
    aes: [{ name: 'workstation', title: 'WORKSTATION', start: [] }],
    links: [],
    files: [{ fixture: 'ct-explicit-le.dcm', to: '/lab/ct.dcm' }],
    console: 'workstation',
  },
  chips: [],
  codex: [
    {
      id: 'preamble',
      term: 'the preamble',
      simple: 'The first 128 bytes of a Part 10 file, free for other uses and often all zero.',
      sources: ['filereader/filereader.go'],
      tryIt: 'go-dicom show ct.dcm',
    },
    {
      id: 'dicm-prefix',
      term: 'the DICM prefix',
      simple: 'Four letters after the preamble that say this is a DICOM file.',
      sources: [],
    },
  ],
  story: {
    scene: 'story.md#scene',
    debrief: 'story.md#debrief',
    realWorld: 'story.md#real-world',
  },
  hints: [{ text: 'Start at the top.' }, { text: 'The prefix is four letters.' }, { text: 'Look at offset 128.' }],
  objectives: [
    {
      id: 'select-the-preamble',
      text: 'Select the preamble of ct.dcm.',
      check: { kind: 'selected', file: '/lab/ct.dcm', region: 'preamble' },
    },
    {
      id: 'select-the-meta',
      text: 'Select the File Meta Information of ct.dcm.',
      check: { kind: 'selected', file: '/lab/ct.dcm', region: 'file-meta-information' },
    },
  ],
}

function contentOf(chapter: ChapterDefinition): GameContent {
  const built = createGameContent({ chapters: [chapter], missions: [DEBRIEF_MISSION] })
  if (!built.ok) {
    throw new Error(built.errors.join('\n'))
  }
  return built.value
}

export const DEBRIEF_CONTENT: GameContent = contentOf(DEBRIEF_CHAPTER)

/** The progress with the debrief's mission completed, or still being played. */
export const debriefProgressOf = (completed: boolean): Progress => ({
  missions: [
    {
      missionId: DEBRIEF_MISSION.id,
      firstStartedAt: 0,
      completedAt: completed ? 1 : null,
      attempts: 1,
      hintsRevealed: 0,
    },
  ],
  completionOrder: completed ? [DEBRIEF_MISSION.id] : [],
  lastActive: DEBRIEF_MISSION.id,
})
