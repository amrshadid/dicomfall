import type { ChapterDefinition, MissionStatus } from '@dicomfall/game/types'
import type { JourneyChapterSource, JourneyMissionSource } from '@features/map/types'

// For the map's tests only: the curriculum's six stages and the Bridge as the game lists them, and
// missions made up where a test needs more than one.

const STAGES: readonly (readonly [id: string, title: string, summary: string, label?: string])[] = [
  [
    'the-first-file',
    'The First File',
    'What a DICOM file holds, read with go-dicom and as bytes, and its four regions.',
  ],
  ['the-elements', 'The elements', 'Tags, Value Representation, value length and multiplicity, and sequences.'],
  ['the-object', 'The object', 'Study, Series and SOP Instance UIDs, SOP Classes, and the pixel attributes.'],
  ['the-bridge', 'Bridge', 'The same SOP Instance UID on disk and on the wire.', 'Bridge'],
  [
    'the-association',
    'The association',
    'Application entities, AE titles, SCU and SCP roles, and presentation contexts.',
  ],
  ['query-and-retrieve', 'Query and retrieve', 'C-FIND, C-GET, C-MOVE, status codes and C-STORE sub-operations.'],
  ['interoperability', 'Interoperability', 'Conformance statements, compressed transfer syntaxes and DICOMweb.'],
]

export const FIRST_MISSION: JourneyMissionSource = {
  id: 'what-the-file-says',
  title: 'What the File Says',
  objective: 'Open the CT file with go-dicom and say what it holds: its patient, its study and its image.',
  skills: ['read-a-file', 'name-the-elements'],
  prerequisites: [],
  minutes: 15,
  codex: [
    {
      id: 'data-set',
      term: 'Data Set',
      simple: 'The elements that describe one object.',
      sources: ['dataset/dataset.go'],
    },
  ],
}

export const SECOND_MISSION: JourneyMissionSource = {
  id: 'under-the-words',
  title: 'Under the Words',
  objective: 'Find the bytes under the first element go-dicom printed.',
  skills: ['read-the-bytes'],
  prerequisites: ['name-the-elements'],
  codex: [],
}

/** The skill tree's part the fixture's missions name; `read-the-bytes` is left out, to be named by its id. */
export const JOURNEY_SKILLS = [
  { id: 'read-a-file', title: 'Read what a DICOM file holds with go-dicom' },
  { id: 'name-the-elements', title: 'Name the elements go-dicom prints' },
] as const

/** Stage 1's first region, as chapters.yaml writes it. */
const OPEN_THE_FILE = {
  id: 'open-the-file',
  name: 'Open the file',
  caption: 'what a DICOM file holds, read with go-dicom and as bytes',
  guide: 'The Preamble',
  source: 'cli/show.go, cli/info.go, PS3.10 §7',
}

type Missions = JourneyChapterSource['missions']

function entry(mission: JourneyMissionSource, status: MissionStatus, attempts = 0, hintsUsed = 0): Missions[number] {
  return { mission, status, attempts, hintsUsed }
}

function journey(missions: Missions): readonly JourneyChapterSource[] {
  let stage = 0
  return STAGES.map(([id, title, summary, label]) => {
    const own = id === 'the-first-file' ? missions : []
    const regions = own.length === 0 ? [] : [{ ...OPEN_THE_FILE, missions: own.map((each) => each.mission.id) }]
    // As the game numbers them: a labelled chapter takes no stage number, so the ones after it keep theirs.
    const common = { id, title, summary, outcomes: [], regions }
    if (label !== undefined) {
      const chapter: ChapterDefinition = { ...common, label, heading: label, numberPrefix: label.charAt(0) }
      return { chapter, missions: own }
    }
    stage += 1
    const chapter: ChapterDefinition = { ...common, stage, heading: `Stage ${stage}`, numberPrefix: String(stage) }
    return { chapter, missions: own }
  })
}

/** The curriculum with one mission written: six stages, the Bridge, and the first mission of stage 1. */
export function journeyFixture(status: MissionStatus = 'available', attempts = 0, hintsUsed = 0) {
  return journey([entry(FIRST_MISSION, status, attempts, hintsUsed)])
}

/** A second mission in stage 1 that needs the first: completed and available, or under way and locked. */
export function longerJourneyFixture(firstDone: boolean) {
  return journey(
    firstDone
      ? [entry(FIRST_MISSION, 'completed', 3, 2), entry(SECOND_MISSION, 'available')]
      : [entry(FIRST_MISSION, 'in_progress', 1), entry(SECOND_MISSION, 'locked')]
  )
}
