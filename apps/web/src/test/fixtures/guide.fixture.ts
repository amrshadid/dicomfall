import type { GuideHint, GuideObjective } from '@features/guide/types'

// Made up to lay screens out and test them: mission text comes from the missions package, checked on the Machine.

export const OBJECTIVES: readonly GuideObjective[] = [
  { id: 'preamble', text: 'Mark the preamble of `/lab/ct.dcm`.', passed: true },
  { id: 'prefix', text: 'Mark the `DICM` prefix.', passed: false },
  { id: 'meta', text: 'Mark the File Meta Information.', passed: false },
]

/** A mission's three hints, as the content gives them: a nudge, the concept, the spot. None gives a command. */
export const MISSION_HINTS = [
  { text: 'Count the bytes before the first readable letters.' },
  { text: 'A Part 10 file opens with a fixed-size preamble, then a four-byte prefix.' },
  { text: 'The File Meta Information starts right after the prefix, at offset 132.' },
] as const

export const HINTS: readonly GuideHint[] = [
  { tier: 'a nudge', text: MISSION_HINTS[0].text },
  { tier: 'the concept', text: MISSION_HINTS[1].text },
  { tier: 'the spot', text: MISSION_HINTS[2].text },
]

export const COMMANDS = [
  { command: 'ls /lab', explain: 'The files of the lab.' },
  { command: 'xxd -l 132 /lab/ct.dcm', explain: 'The first 132 bytes of the file, in hexadecimal.' },
] as const
