import type { GameContent } from '#types/definitions/content'
import type { ChapterDefinition, MissionDefinition } from '#types/definitions/mission'
import type { SkillDefinition } from '#types/definitions/skills'
import { createGameContent } from '#utils/content/index'
import { validateChapters, validateMission } from '#utils/validate/index'

/** Explicit VR Little Endian, the transfer syntax of the example file. */
export const EXPLICIT_VR_LITTLE_ENDIAN = '1.2.840.10008.1.2.1'

/** CT Image Storage. */
export const CT_IMAGE_STORAGE = '1.2.840.10008.5.1.4.1.1.2'

/**
 * A parsed `mission.yaml` that uses every field of the schema: find the File Meta Information of
 * a CT file, then its Transfer Syntax UID, and predict where that element starts.
 */
export const EXAMPLE_MISSION_YAML = {
  id: 'the-transfer-syntax',
  version: 1,
  title: 'The Transfer Syntax',
  chapter: 'the-first-file',
  objective: 'Find the Transfer Syntax UID in the File Meta Information and say which encoding it names.',
  skills: ['read-the-transfer-syntax'],
  prerequisites: [],
  summary: 'Read the one element that tells a reader how the rest of the file is encoded.',
  minutes: 15,
  teaches: ['transfer-syntax'],
  names: ['implicit-vr'],
  uses: ['file-meta-information'],
  objectives: [
    {
      id: 'find-the-meta',
      text: 'Select the File Meta Information of ct.dcm.',
      check: { kind: 'selected', file: '/lab/ct.dcm', region: 'file-meta-information' },
    },
    {
      id: 'name-the-syntax',
      text: 'Give the Transfer Syntax UID of ct.dcm.',
      check: { kind: 'answer', file: '/lab/ct.dcm', element: '(0002,0010)' },
    },
    {
      id: 'predict-the-offset',
      text: 'Predict where the Transfer Syntax UID element starts.',
      check: { kind: 'offset', file: '/lab/ct.dcm', element: '(0002,0010)', offset: 228 },
    },
  ],
  hints: [
    { text: 'Everything after the DICM prefix starts with group 0002 for a while.' },
    { text: 'The File Meta Information is always Explicit VR Little Endian, whatever the data set uses.' },
    { text: 'Print the meta elements and look for (0002,0010).', command: 'go-dicom show /lab/ct.dcm' },
  ],
  chips: [{ command: 'go-dicom show /lab/ct.dcm', explain: 'print every element of the file, one per line' }],
  codex: [
    {
      id: 'transfer-syntax',
      term: 'Transfer Syntax',
      simple: 'The rule for how a data set is written: byte order, explicit or implicit VR, compression.',
      deep: 'Named by a UID in (0002,0010). The File Meta Information itself is always Explicit VR Little Endian.',
      sources: ['filereader/meta.go'],
      docs: 'https://dicom.nema.org/medical/dicom/current/output/html/part05.html#chapter_10',
      tryIt: 'go-dicom show /lab/ct.dcm',
    },
  ],
  story: { scene: 'story.md#scene', debrief: 'story.md#debrief', realWorld: 'story.md#real-world' },
} as const

/** The example `mission.yaml` with `fields` changed; throws if it doesn't validate. */
export function exampleMission(fields: Readonly<Record<string, unknown>> = {}): MissionDefinition {
  const result = validateMission({ ...EXAMPLE_MISSION_YAML, ...fields })
  if (!result.ok) {
    throw new Error(result.errors.join('\n'))
  }
  return result.value
}

export const EXAMPLE_MISSION: MissionDefinition = exampleMission()

/** A second mission that needs the first one, for unlock and status tests; its card deepens the first's. */
export const FOLLOW_UP_MISSION: MissionDefinition = exampleMission({
  id: 'explicit-and-implicit',
  title: 'Explicit and Implicit',
  skills: ['tell-explicit-from-implicit'],
  prerequisites: ['read-the-transfer-syntax'],
  teaches: ['implicit-vr'],
  names: [],
  uses: ['transfer-syntax'],
  codex: [
    {
      id: 'implicit-vr',
      term: 'Transfer Syntax, implicit VR',
      simple: 'An encoding that leaves out each element’s VR: the reader looks it up in the dictionary.',
      deepens: 'transfer-syntax',
      sources: ['filereader/reader.go'],
    },
  ],
})

const HINTS = [
  { text: 'Two AEs have to agree before anything is sent.' },
  { text: 'An association offers presentation contexts; the receiver accepts or refuses each one.' },
  { text: 'Ask the archive whether it is there.', command: 'go-dicom echoscu archive' },
]

/** A parsed `mission.yaml` judged on the wire: one check of every wire kind. */
export const WIRE_MISSION_YAML = {
  id: 'echo-then-store',
  version: 1,
  title: 'Echo, Then Store',
  chapter: 'the-first-file',
  objective: 'Prove the archive answers, then send it the CT and prove it arrived.',
  skills: ['store-an-instance'],
  prerequisites: [],
  teaches: [],
  uses: [],
  objectives: [
    {
      id: 'echo',
      text: 'The archive answers C-ECHO from the modality.',
      check: { kind: 'echo', from: 'modality', to: 'archive' },
    },
    {
      id: 'agreed',
      text: 'An association carries CT Image Storage in Explicit VR Little Endian.',
      check: { kind: 'association', abstractSyntax: CT_IMAGE_STORAGE, transferSyntax: EXPLICIT_VR_LITTLE_ENDIAN },
    },
    {
      id: 'refused',
      text: 'The viewer refuses CT Image Storage.',
      check: { kind: 'rejected-context', abstractSyntax: CT_IMAGE_STORAGE, result: 'abstract-syntax-not-supported' },
    },
    { id: 'success', text: 'The store succeeds.', check: { kind: 'status', status: 0 } },
    {
      id: 'arrived',
      text: 'The archive holds the CT.',
      check: { kind: 'received', ae: 'archive', sopInstanceUid: '1.2.826.0.1.3680043.8.498.1' },
    },
    {
      id: 'retrieved',
      text: 'C-GET brings back one instance.',
      check: { kind: 'subops', operation: 'C-GET', completed: 1 },
    },
  ],
  hints: HINTS,
  story: { scene: 'story.md#scene', debrief: 'story.md#debrief', realWorld: 'story.md#real-world' },
} as const

/** A parsed `chapters.yaml`: one stage with missions and one still to come. */
export const EXAMPLE_CHAPTERS_YAML = {
  chapters: [
    {
      id: 'the-first-file',
      title: 'The first file',
      summary: 'Find the four regions of a Part 10 file and what its File Meta Information says.',
      story: 'A CT file arrived with no viewer to open it.',
      guide: 'The Preamble',
      standsFor: 'Part 10, the file format',
      outcomes: ['find the four regions of a Part 10 file', 'read the Transfer Syntax UID'],
    },
    {
      id: 'the-elements',
      title: 'The elements',
      summary: 'Read tags, VRs and lengths.',
      story: 'The same image, written two ways.',
      guide: 'VR',
      standsFor: 'Part 5, data structures and encoding',
      outcomes: ['find one element in the hex'],
    },
  ],
} as const

export function exampleChapters(): readonly ChapterDefinition[] {
  const result = validateChapters(EXAMPLE_CHAPTERS_YAML)
  if (!result.ok) {
    throw new Error(result.errors.join('\n'))
  }
  return result.value
}

/** Content built from `missions` with the example chapters; throws if it doesn't validate. */
export function contentOf(missions: readonly MissionDefinition[]): GameContent {
  const content = createGameContent({ chapters: exampleChapters(), missions })
  if (!content.ok) {
    throw new Error(content.errors.join('\n'))
  }
  return content.value
}

/** The example missions' skills, in a region of their own. */
export const EXAMPLE_REGION = {
  id: 'transfer-syntaxes',
  name: 'The transfer syntax',
  caption: 'read the Transfer Syntax UID, then tell explicit from implicit VR',
  guide: 'The Preamble',
  source: 'filereader/, PS3.10',
  missions: ['the-transfer-syntax', 'explicit-and-implicit'],
} as const

export const EXAMPLE_SKILLS: readonly SkillDefinition[] = [
  {
    id: 'read-the-transfer-syntax',
    title: "Read a file's Transfer Syntax UID",
    region: EXAMPLE_REGION.id,
    prerequisites: [],
  },
  {
    id: 'tell-explicit-from-implicit',
    title: 'Tell explicit VR from implicit VR',
    region: EXAMPLE_REGION.id,
    prerequisites: ['read-the-transfer-syntax'],
  },
]

/** The example mission, then the one it unlocks. */
export const exampleContent = (): GameContent => contentOf([EXAMPLE_MISSION, FOLLOW_UP_MISSION])
