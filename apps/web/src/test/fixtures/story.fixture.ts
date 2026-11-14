import type { GuideStory, GuideStoryBlock } from '@features/guide/types'

// Made up to lay the Guide out and test its pacing: mission stories come from the missions package,
// their output copied from a real run on the Machine.

const line = (speaker: string | null, text: string): GuideStoryBlock => ({ kind: 'line', speaker, text })
const PAUSE: GuideStoryBlock = { kind: 'pause' }

export const STORY_SCENE: readonly GuideStoryBlock[] = [
  line(null, 'The lab is quiet. One file waits in `/lab/`, and tonight it has to reach the archive.'),
  line('The Preamble', 'I am the Preamble: the first 128 bytes of that file. There is nothing in me, and I know it.'),
  line('VR', 'Nothing yet. Wait until you meet the elements.'),
]

export const STORY_SEE: readonly GuideStoryBlock[] = [
  line('The Preamble', 'See what the lab holds. Type `ls /lab`, then read what it prints.'),
  PAUSE,
  {
    kind: 'code',
    text: 'ct.dcm',
  },
  line('The Preamble', 'One file. `ct.dcm` is the instance you will follow all night.'),
  {
    kind: 'predict',
    speaker: 'The Preamble',
    text: 'If you read its first four bytes after me, what will they spell?',
    options: [
      { text: 'Nothing at all', right: false },
      { text: 'DICM', right: true },
    ],
  },
  PAUSE,
  line('The Preamble', '`DICM`: the prefix that tells a reader this is a Part 10 file.'),
]

export const STORY_BUILD: readonly GuideStoryBlock[] = [
  line('The Preamble', 'Now find where the File Meta Information starts.'),
  {
    kind: 'predict',
    speaker: 'The Preamble',
    text: 'At which offset does it start?',
    options: [
      { text: '132', right: true },
      { text: '128', right: false },
    ],
  },
  line('The Preamble', 'At 132: 128 bytes of me, then the four bytes of the prefix.'),
]

export const STORY_DEBRIEF: readonly GuideStoryBlock[] = [
  line('The Preamble', 'You found the four regions of a Part 10 file.'),
]

export const STORY_REAL_WORLD: readonly GuideStoryBlock[] = [
  line(null, 'On your own machine, the same commands read any DICOM file you have.'),
]

export const STORY: GuideStory = new Map([
  ['scene', STORY_SCENE],
  ['see-it', STORY_SEE],
  ['build-it', STORY_BUILD],
  ['debrief', STORY_DEBRIEF],
  ['real-world', STORY_REAL_WORLD],
])
