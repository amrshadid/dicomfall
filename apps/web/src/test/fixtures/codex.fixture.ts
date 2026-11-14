import type { ChapterDefinition, CodexCard, CodexChapter, CodexView, FieldGuideEntry } from '@dicomfall/game/types'

// Made up to lay the Codex out and test it: cards come from the missions, their sources paths in
// go-dicom's tree. The second chapter is the Bridge, so a labelled chapter is always tested.

const THE_FIRST_FILE: ChapterDefinition = {
  id: 'the-first-file',
  stage: 1,
  heading: 'Stage 1',
  numberPrefix: '1',
  title: 'The First File',
  summary: 'Open one file and find its four regions.',
  story: 'One CT file waits on the disk. Before it goes anywhere, find what is in it.',
  guide: 'The Preamble',
  standsFor: 'Part 10, the file format',
  outcomes: [
    'Find the four regions of a Part 10 file.',
    'Read the Transfer Syntax UID and say what it tells the reader.',
  ],
  regions: [],
}

const THE_BRIDGE: ChapterDefinition = {
  id: 'the-bridge',
  label: 'Bridge',
  heading: 'Bridge',
  numberPrefix: 'B',
  title: 'On disk and on the wire',
  summary: 'The same instance as a file and as a message.',
  outcomes: ['Tell the File Meta Information from the Command Set.'],
  regions: [],
}

const PREAMBLE: CodexCard = {
  id: 'preamble',
  term: 'the preamble',
  simple: 'The first 128 bytes of a Part 10 file, free for other uses and often all zero.',
  deep: 'PS3.10 §7.1 leaves the preamble to the application; `DICM` follows it at offset 128.',
  sources: ['filereader/filereader.go'],
  docs: 'https://dicom.nema.org/medical/dicom/current/output/html/part10.html#sect_7.1',
  tryIt: 'go-dicom show ct.dcm',
}

const PREFIX: CodexCard = {
  id: 'dicm-prefix',
  term: 'the DICM prefix',
  simple: 'Four letters after the preamble that say this is a DICOM file.',
  sources: ['filereader/filereader.go'],
}

const TRANSFER_SYNTAX: CodexCard = {
  id: 'transfer-syntax',
  term: 'Transfer Syntax',
  simple: 'How the Data Set is written: byte order, explicit or implicit VR, compression.',
  deepens: 'preamble',
  sources: [],
}

const COMMAND_SET: CodexCard = {
  id: 'command-set',
  term: 'the Command Set',
  simple: 'The part of a DIMSE message that says what to do with the Data Set.',
  sources: [],
}

export const FIRST_CHAPTER: CodexChapter = {
  chapter: THE_FIRST_FILE,
  filed: 2,
  total: 3,
  finished: false,
  youCanNow: [],
  cards: [
    {
      card: PREAMBLE,
      missionId: 'open-the-file',
      missionNumber: '1.1',
      state: 'filed',
      deepens: null,
      deepenedBy: [{ cardId: 'transfer-syntax', term: 'Transfer Syntax', missionNumber: '1.3', state: 'hidden' }],
    },
    {
      card: PREFIX,
      missionId: 'the-four-regions',
      missionNumber: '1.2',
      state: 'filed',
      deepens: null,
      deepenedBy: [],
    },
    {
      card: TRANSFER_SYNTAX,
      missionId: 'the-transfer-syntax',
      missionNumber: '1.3',
      state: 'hidden',
      deepens: { cardId: 'preamble', term: 'the preamble', missionNumber: '1.1', state: 'filed' },
      deepenedBy: [],
    },
  ],
}

export const SECOND_CHAPTER: CodexChapter = {
  chapter: THE_BRIDGE,
  filed: 0,
  total: 1,
  finished: false,
  youCanNow: [],
  cards: [
    {
      card: COMMAND_SET,
      missionId: 'on-disk-and-on-the-wire',
      missionNumber: 'B.1',
      state: 'seen',
      deepens: null,
      deepenedBy: [],
    },
  ],
}

export const CODEX: CodexView = {
  chapters: [FIRST_CHAPTER, SECOND_CHAPTER],
  glossary: [
    { term: 'the preamble', simple: PREAMBLE.simple, cardId: 'preamble', missionNumber: '1.1' },
    { term: 'the DICM prefix', simple: PREFIX.simple, cardId: 'dicm-prefix', missionNumber: '1.2' },
  ],
  filed: 2,
  total: 4,
}

/** The first chapter with every mission done: all cards filed, its "You can now…" lines shown. */
export const FINISHED_CODEX: CodexView = {
  ...CODEX,
  chapters: [
    {
      ...FIRST_CHAPTER,
      filed: 3,
      finished: true,
      youCanNow: THE_FIRST_FILE.outcomes,
      cards: FIRST_CHAPTER.cards.map((entry) => ({
        ...entry,
        state: 'filed',
        deepenedBy: entry.deepenedBy.map((link) => ({ ...link, state: 'filed' })),
      })),
    },
    SECOND_CHAPTER,
  ],
}

export const FIELD_GUIDE: readonly FieldGuideEntry[] = [
  {
    name: 'go-dicom show',
    kind: 'go-dicom',
    what: 'Prints every element of a file, one per line.',
    firstMet: 'open-the-file',
    deepenedIn: ['the-transfer-syntax'],
  },
  {
    name: 'xxd',
    kind: 'shell',
    what: "Prints a file's bytes in hexadecimal.",
    firstMet: 'open-the-file',
    deepenedIn: [],
  },
]

/** "1.1 Open the File", as the Codex labels a mission. */
export const MISSION_LABELS: Readonly<Record<string, string>> = {
  'open-the-file': '1.1 Open the File',
  'the-four-regions': '1.2 The Four Regions',
  'the-transfer-syntax': '1.3 The Transfer Syntax',
  'on-disk-and-on-the-wire': 'B.1 On Disk and on the Wire',
}

export const missionLabel = (id: string): string => MISSION_LABELS[id] ?? id
