import type { GuideStepId, SpeakerInfo } from '@features/guide/types'

/** The five steps of a mission's story, in order, as the step rail shows them. */
export const GUIDE_STEPS: readonly { readonly id: GuideStepId; readonly label: string }[] = [
  { id: 'scene', label: 'Scene' },
  { id: 'see', label: 'See it' },
  { id: 'build', label: 'Build it' },
  { id: 'watch', label: 'Watch it' },
  { id: 'debrief', label: 'Debrief' },
]

/**
 * The story sections the Guide shows for a step, in order of preference: a step without its own
 * falls back to the one before. The debrief ends with the real world, under its own heading.
 */
export const SECTION_FOR_STEP: Readonly<Record<GuideStepId, readonly string[]>> = {
  scene: ['scene'],
  see: ['see-it', 'scene'],
  build: ['build-it', 'see-it'],
  watch: ['watch-it', 'debrief'],
  debrief: ['debrief', 'watch-it'],
}

/** The section that closes the story, read after the debrief. */
export const REAL_WORLD_SECTION = 'real-world'
export const REAL_WORLD_HEADING = 'In the real world'

/** By the name the story gives them. Each is a real part of the standard and speaks as what it is (docs/GAME.md §4). */
export const SPEAKERS: Readonly<Record<string, SpeakerInfo>> = {
  'The Preamble': {
    id: 'preamble',
    name: 'The Preamble',
    term: 'the 128 bytes at the start of a Part 10 file',
    portrait: 'preamble',
  },
  VR: { id: 'vr', name: 'VR', term: 'the Value Representation: how a value is encoded', portrait: 'vr' },
  'The Instance UID': {
    id: 'instance-uid',
    name: 'The Instance UID',
    term: "the SOP Instance UID: the instance's name everywhere",
    portrait: 'instance-uid',
  },
  'The SCP': { id: 'scp', name: 'The SCP', term: 'the receiving side of a DIMSE service', portrait: 'scp' },
  'The Archive': {
    id: 'archive',
    name: 'The Archive',
    term: 'a store that answers queries and retrievals',
    portrait: 'archive',
  },
  'The Conformance Statement': {
    id: 'conformance-statement',
    name: 'The Conformance Statement',
    term: 'the document that says what an implementation supports',
    portrait: 'conformance-statement',
  },
}

/** A line the story gives no speaker. */
export const NARRATOR: SpeakerInfo = { id: 'narrator', name: '', term: '', portrait: null }

/** How the Guide names each hint, in Kernelfall's order: "Hint 1, a nudge". */
export const HINT_TIER_NAMES: readonly string[] = ['a nudge', 'the concept', 'the spot']

/** The Guide's note while building. */
export const BUILD_NOTE =
  'Objectives tick on their own as you mark bytes, give answers and change the lab; there is no Submit button.'

/**
 * A line that asks the player to select something in the inspector ("select the first row of
 * group 0002"): the selection itself is what the story waits for, not an objective.
 */
export const ASKS_TO_SELECT = /\bselect\b/i
