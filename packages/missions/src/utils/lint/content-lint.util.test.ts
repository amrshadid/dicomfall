import type { MissionDefinition } from '@dicomfall/game/types'
import { describe, expect, it } from 'vitest'
import type { VocabularyRule } from '#types/definitions/lint'
import { countAsides, countWords, lintMission, strayWords } from '#utils/lint/content-lint.util'
import { parseStory } from '#utils/story/story.util'

const words = (n: number) => Array.from({ length: n }, () => 'word').join(' ')

const CARD = {
  id: 'transfer-syntax',
  term: 'Transfer Syntax',
  simple: 'The rule for how a Data Set is written.',
  sources: [],
}

function missionWith(fields: Partial<MissionDefinition>): MissionDefinition {
  return { id: 'the-transfer-syntax', teaches: [], codex: [CARD], ...fields } as MissionDefinition
}

function storyWith(sections: Readonly<Record<string, string>>) {
  return parseStory(
    `# Title\n\n**Question:** Why?\n\n${Object.entries(sections)
      .map(([heading, body]) => `## ${heading}\n\n${body}\n`)
      .join('\n')}`
  )
}

const KEEPS_BUDGETS = storyWith({
  Scene: `> **The Preamble:** ${words(70)}`,
  'See it': `> **The Preamble:** ${words(190)}\n\n\`\`\`\n${words(500)}\n\`\`\``,
  'Build it': words(140),
  'Watch it': words(100),
  Debrief: words(40),
  'Real world': words(300),
})

describe('countWords', () => {
  it('counts tokens with a letter or digit, inline code included, and skips dashes', () => {
    expect(countWords('Run `go-dicom show ct.dcm` now — 3 times.')).toBe(7)
  })
})

describe('countAsides', () => {
  it('counts parentheses in prose, not in inline code', () => {
    expect(countAsides('Find `(0002,0010)` (the syntax), then (again) `xxd`.')).toBe(2)
  })
})

describe('lintMission', () => {
  it('measures each step without its code and finds nothing in a mission that keeps every budget', () => {
    const lint = lintMission(missionWith({ teaches: ['transfer-syntax', 'implicit-vr'] }), KEEPS_BUDGETS)

    expect(lint.steps.map((step) => [step.section, step.words])).toEqual([
      ['scene', 70],
      ['see-it', 190],
      ['build-it', 140],
      ['watch-it', 100],
      ['debrief', 40],
    ])
    expect(lint.storyWords).toBe(540)
    expect(lint.problems).toEqual([])
  })

  it('names every budget a mission breaks', () => {
    const story = storyWith({
      Scene: `> **The Preamble:** ${words(90)} (an aside)`,
      'See it': 'The game restarts the VM. Your numbers will differ.',
      Debrief: words(10),
      'Real world': 'The emulator is v86, a simulation.',
    })
    const mission = missionWith({
      teaches: ['a', 'b', 'c', 'd'],
      codex: [{ ...CARD, simple: words(30), deep: words(81) }],
    })

    expect(lintMission(mission, story).problems).toEqual([
      'teaches 4 concepts (budget 3)',
      'story: 111 words (budget 500–650)',
      'scene: 92 words (budget 80)',
      '1 parenthetical asides (budget 0)',
      'see-it: "the game"',
      'see-it: "the VM"',
      'see-it: "your numbers will differ"',
      'real-world: "emulator"',
      'real-world: "simulation"',
      'codex transfer-syntax: simple 30 words (budget 25)',
      'codex transfer-syntax: deep 81 words (budget 80)',
    ])
  })

  it('flags a word of the vocabulary used outside its one meaning', () => {
    const story = storyWith({ Scene: 'The modality is a node. The study level is fine.' })
    expect(lintMission(missionWith({}), story).banned).toEqual([
      {
        phrase: 'AE (only an application entity such as the modality or the archive, never a node, a box or a device)',
        section: 'scene',
      },
    ])
  })
})

describe('strayWords', () => {
  const RULES: readonly VocabularyRule[] = [
    { word: 'element', means: 'a tag, a VR and a value', pattern: /\bfields?\b/gi, allowed: /\bbit fields?\b/g },
    { word: 'wire', means: 'the network', pattern: /\bwires?\b/gi, only: ['on-disk-and-on-the-wire'] },
    { word: 'context', means: 'a presentation context', pattern: /\bcontexts?\b/gi, chapters: ['the-association'] },
  ]
  const transferSyntax = { id: 'the-transfer-syntax', chapter: 'the-first-file' }

  it('flags a word outside its allowed ways, and leaves inline code alone', () => {
    expect(strayWords(transferSyntax, 'Two bit fields. See `field`.', RULES)).toEqual([])
    expect(strayWords(transferSyntax, 'The field holds a UID.', RULES)).toEqual([
      'element (only a tag, a VR and a value)',
    ])
  })

  it('lets the missions named in `only` use a word freely', () => {
    expect(strayWords({ id: 'on-disk-and-on-the-wire', chapter: 'the-bridge' }, 'On the wire.', RULES)).toEqual([])
    expect(strayWords(transferSyntax, 'On the wire.', RULES)).toEqual(['wire (only the network)'])
  })

  it('lets every mission of the stages named in `chapters` use a word freely', () => {
    expect(strayWords({ id: 'echo-then-store', chapter: 'the-association' }, 'One context.', RULES)).toEqual([])
    expect(strayWords(transferSyntax, 'One context.', RULES)).toEqual(['context (only a presentation context)'])
  })
})
