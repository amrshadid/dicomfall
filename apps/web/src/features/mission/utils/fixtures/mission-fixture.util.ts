import type { ChapterDefinition, MissionDefinition } from '@dicomfall/game/types'
import type { LoadedContent, Story } from '@dicomfall/missions/types'
import { STORY } from '@/test/fixtures/story.fixture'

// Made up to test the mission's screens without the content on disk, which changes as missions are
// written. Only tests import this.

export const CHAPTER_FIXTURE: ChapterDefinition = {
  id: 'the-first-file',
  stage: 1,
  heading: 'Stage 1',
  numberPrefix: '1',
  title: 'The First File',
  summary: 'What DICOM describes and how Part 10 packages a Data Set.',
  guide: 'The Preamble',
  outcomes: [],
  regions: [],
}

export const MISSION_FIXTURE: MissionDefinition = {
  id: 'the-four-regions',
  version: 1,
  title: 'The Four Regions',
  chapter: CHAPTER_FIXTURE.id,
  objective: 'Mark the preamble, the prefix, the File Meta Information and the Data Set of one file.',
  skills: ['part-10-regions'],
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
  chips: [{ command: 'ls /lab', explain: 'The files of the lab.' }],
  codex: [
    {
      id: 'preamble',
      term: 'the preamble',
      simple: 'The first 128 bytes of a Part 10 file, free for any use and often empty.',
      sources: ['filereader/reader.go'],
    },
  ],
  story: {
    scene: 'story.md#scene',
    seeIt: 'story.md#see-it',
    buildIt: 'story.md#build-it',
    debrief: 'story.md#debrief',
    realWorld: 'story.md#real-world',
  },
  hints: [
    { text: 'Count the bytes before the first readable letters.' },
    { text: 'A Part 10 file opens with a fixed-size preamble, then a four-byte prefix.' },
    { text: 'The File Meta Information starts right after the prefix.' },
  ],
  objectives: [
    {
      id: 'preamble',
      text: 'Mark the preamble.',
      check: { kind: 'selected', file: '/lab/ct.dcm', region: 'preamble' },
    },
    {
      id: 'prefix',
      text: 'Mark the `DICM` prefix.',
      check: { kind: 'selected', file: '/lab/ct.dcm', region: 'prefix' },
    },
    {
      id: 'meta',
      text: 'Mark the File Meta Information.',
      check: { kind: 'selected', file: '/lab/ct.dcm', region: 'file-meta-information' },
    },
  ],
}

export const STORY_FIXTURE: Story = { title: MISSION_FIXTURE.title, question: null, sections: STORY }

/** The game's content with this one mission in it, as `useContent()` hands it to a container. */
export const CONTENT_FIXTURE: LoadedContent = {
  game: {
    chapters: [CHAPTER_FIXTURE],
    missions: [MISSION_FIXTURE],
    concepts: [],
    fieldGuide: { entries: [] },
    skills: [],
    mission: (id) => (id === MISSION_FIXTURE.id ? MISSION_FIXTURE : undefined),
    skill: () => undefined,
    earnedIn: (id) => (MISSION_FIXTURE.skills.includes(id) ? MISSION_FIXTURE : undefined),
    missionsIn: (chapter) => (chapter === CHAPTER_FIXTURE.id ? [MISSION_FIXTURE] : []),
    numberOf: (id) => (id === MISSION_FIXTURE.id ? '1.1' : undefined),
    concept: () => undefined,
    card: (id) => {
      const card = MISSION_FIXTURE.codex.find((candidate) => candidate.id === id)
      return card ? { card, missionId: MISSION_FIXTURE.id } : undefined
    },
  },
  storyOf: (id) => (id === MISSION_FIXTURE.id ? STORY_FIXTURE : undefined),
  folderOf: (id) => (id === MISSION_FIXTURE.id ? '1-the-first-file/01-the-four-regions' : undefined),
}
