import type { MissionId } from '@dicomfall/game/types'
import type { VocabularyRule } from '#types/definitions/lint'

/** The guided steps of a story and their word budgets; the real-world card has none. */
export const STEP_WORD_BUDGETS: Readonly<Record<string, number>> = {
  scene: 80,
  'see-it': 200,
  'build-it': 150,
  'watch-it': 120,
  debrief: 50,
}

export const STORY_WORD_BUDGET = { min: 500, max: 650 } as const

export const CODEX_WORD_BUDGETS = { simple: 25, deep: 80 } as const

export const ASIDE_BUDGET = 0

// What happens off the lab, and hedges: matched case-insensitively, as whole words. The Machine
// is real Linux running real go-dicom, so a story never calls it a simulation.
export const BANNED_PHRASES: readonly string[] = [
  'the game',
  'this game',
  'emulator',
  'emulated',
  'simulated',
  'simulation',
  'the VM',
  'your numbers will differ',
  'your numbers may differ',
  'yours will differ',
  'next release',
]

// One meaning per word, so a player never has to unlearn one. A first draft until docs/GAME.md
// holds the vocabulary: only what a pattern can tell apart is here, and a reader checks the rest.
export const VOCABULARY: readonly VocabularyRule[] = [
  {
    word: 'the Machine',
    means: 'the one Linux computer every AE runs in, always with a capital M',
    pattern: /\bthe machine\b/,
  },
  {
    word: 'AE',
    means: 'an application entity such as the modality or the archive, never a node, a box or a device',
    pattern: /\b(nodes?|box(es)?|devices?)\b/i,
  },
  {
    word: 'Data Set',
    means: 'the encoded elements of one object, written as two words, never "dataset"',
    pattern: /\bdatasets?\b/i,
  },
  {
    word: 'stage',
    means: 'one part of the journey; never a level, an act or a chapter',
    pattern: /\b(levels?|acts?|chapters?)\b/i,
    // The Query/Retrieve Level, (0008,0052), is the standard's own word: a query is made at the
    // patient, study, series or image level.
    allowed: /\b(query\/retrieve|patient|study|series|image) levels?\b/gi,
  },
  {
    word: 'mission',
    means: 'one stop of a stage; never a lesson',
    pattern: /\blessons?\b/i,
  },
]

// Written to the standard: their budgets fail the tests; the others only warn. Empty until the
// first missions are written against real runs.
export const ENFORCED_MISSIONS: readonly MissionId[] = []
