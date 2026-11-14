import { describe, expect, it } from 'vitest'
import { parseStory, sectionOf, slugify, storyProblems, storySteps } from '#utils/story/story.util'

const STORY = `# The Transfer Syntax

**Question:** How does a reader know how the rest of the file is written?

## Scene

> **The Preamble:** Nothing in my 128 bytes says.
>
> **VR:** Then look further in.

## Real world

Run this on any DICOM file:

\`\`\`
go-dicom show ct.dcm
\`\`\`
`

describe('parseStory', () => {
  it('reads the title and the question', () => {
    const story = parseStory(STORY)
    expect(story.title).toBe('The Transfer Syntax')
    expect(story.question).toBe('How does a reader know how the rest of the file is written?')
  })

  it('reads spoken lines with their speaker', () => {
    expect(parseStory(STORY).sections.get('scene')).toEqual([
      { kind: 'line', speaker: 'The Preamble', text: 'Nothing in my 128 bytes says.' },
      { kind: 'line', speaker: 'VR', text: 'Then look further in.' },
    ])
  })

  it('keeps narration and code blocks in order', () => {
    expect(parseStory(STORY).sections.get('real-world')).toEqual([
      { kind: 'line', speaker: null, text: 'Run this on any DICOM file:' },
      { kind: 'code', text: 'go-dicom show ct.dcm' },
    ])
  })

  it('reads --- as a pause, and leaves one inside a code block alone', () => {
    const paced = parseStory('## Build it\n\n> **VR:** Type xxd.\n\n---\n\n```\na\n---\nb\n```\n')
    expect(paced.sections.get('build-it')).toEqual([
      { kind: 'line', speaker: 'VR', text: 'Type xxd.' },
      { kind: 'pause' },
      { kind: 'code', text: 'a\n---\nb' },
    ])
  })

  it('reads a list after a line as a question with its answers, [x] the one that happens', () => {
    const asked = parseStory('## Watch it\n\n> **VR:** Which VR does (0002,0010) have?\n>\n> - US\n> - [x] UI\n')
    expect(asked.sections.get('watch-it')).toEqual([
      {
        kind: 'predict',
        speaker: 'VR',
        text: 'Which VR does (0002,0010) have?',
        options: [
          { text: 'US', right: false },
          { text: 'UI', right: true },
        ],
      },
    ])
  })

  it('leaves a list with no [x] as a list', () => {
    const errand = parseStory('## Build it\n\n> **VR:** Two things:\n>\n> - open the file\n> - find the prefix\n')
    expect(errand.sections.get('build-it')).toEqual([
      { kind: 'line', speaker: 'VR', text: 'Two things:' },
      { kind: 'line', speaker: null, text: '- open the file - find the prefix' },
    ])
  })

  it('keeps the sections in the order of the file', () => {
    expect([...parseStory(STORY).sections.keys()]).toEqual(['scene', 'real-world'])
  })
})

describe('storyProblems', () => {
  it('finds nothing in a story written as the format says', () => {
    expect(storyProblems(STORY)).toEqual([])
  })

  it('names each problem with its line', () => {
    const broken = [
      'Some notes',
      '',
      '## Scene',
      '### Aside',
      '> **VR:** Which?',
      '> - [x] one',
      '> - [x] two',
      '## Scene',
      '```',
      'never closed',
    ].join('\n')
    expect(storyProblems(broken)).toEqual([
      { line: 1, message: 'only the title and the question come before the first section' },
      { line: 1, message: 'expected the mission’s title as "# Title" on the first line' },
      { line: 1, message: 'expected a "**Question:**" line under the title' },
      { line: 4, message: 'only "# Title" and "## Section" headings are read' },
      { line: 6, message: 'a question marks one answer with [x], not several' },
      { line: 8, message: 'the section "Scene" appears twice' },
      { line: 9, message: 'this code block is never closed with ```' },
    ])
  })
})

describe('storySteps', () => {
  it('cuts a section at each pause, keeping a question at the end of its step', () => {
    const blocks = parseStory(
      '## Build it\n\nOne.\n\n---\n\n> **VR:** Before you run it: explicit or implicit?\n>\n> - [x] explicit\n> - implicit\n\n---\n\nTwo.\n'
    ).sections.get('build-it')
    expect(storySteps(blocks ?? []).map((step) => step.map((block) => block.kind))).toEqual([
      ['line'],
      ['predict'],
      ['line'],
    ])
  })
})

describe('slugify and sectionOf', () => {
  it('match the story refs used in mission.yaml', () => {
    expect(slugify('Real world')).toBe('real-world')
    expect(slugify('See it')).toBe('see-it')
    expect(sectionOf('story.md#real-world')).toBe('real-world')
  })
})
