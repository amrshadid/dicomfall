import { describe, expect, it } from 'vitest'
import {
  askedCommands,
  emptinessProblem,
  isPlaceholder,
  readRecordedStory,
  recordPlan,
  replaceRecordedBodies,
  unsafeBody,
} from '#utils/record/recorded-block.util'

const FENCE = '```'

const STORY = `# The First File

**Question:** What is at the start of a DICOM file?

## Scene

> **The Preamble:** Type \`hexdump -C /lab/ct.dcm | head -n 3\`.

---

${FENCE}recorded hexdump -C /lab/ct.dcm | head -n 3
(recorded on the Machine)
${FENCE}

## See it

> **The Preamble:** Type \`cp /lab/ct.dcm /lab/copy.dcm\`, then look at \`DICM\` again.

---

> **The Preamble:** Now type \`ls /lab\`.

${FENCE}recorded@archive ls /lab
(recorded on the Machine)
${FENCE}

## Real world

Run \`go-dicom show ct.dcm\` on your own machine:

${FENCE}
go-dicom show ct.dcm
${FENCE}
`

describe('readRecordedStory', () => {
  it('reads each recorded block with its line, AE, command and body', () => {
    const { blocks, problems } = readRecordedStory(STORY)
    expect(problems).toEqual([])
    expect(blocks).toEqual([
      {
        line: 11,
        ae: null,
        command: 'hexdump -C /lab/ct.dcm | head -n 3',
        expectsEmpty: false,
        body: '(recorded on the Machine)',
        section: 'scene',
      },
      {
        line: 23,
        ae: 'archive',
        command: 'ls /lab',
        expectsEmpty: false,
        body: '(recorded on the Machine)',
        section: 'see-it',
      },
    ])
  })

  it('reads the commands the guide asks for, not values in inline code, and not Real world', () => {
    expect(readRecordedStory(STORY).typed).toEqual([
      { line: 7, command: 'hexdump -C /lab/ct.dcm | head -n 3', section: 'scene' },
      { line: 17, command: 'cp /lab/ct.dcm /lab/copy.dcm', section: 'see-it' },
      { line: 21, command: 'ls /lab', section: 'see-it' },
    ])
  })

  it('leaves plain code blocks alone, inline code in them included', () => {
    const story = readRecordedStory(`## Scene\n\n${FENCE}\nType \`rm -rf /lab\`\n${FENCE}\n`)
    expect(story.blocks).toEqual([])
    expect(story.typed).toEqual([])
  })

  it('keeps a multi-line body with its blank lines', () => {
    const [block] = readRecordedStory(`## Scene\n${FENCE}recorded ls\na\n\nb\n${FENCE}\n`).blocks
    expect(block?.body).toBe('a\n\nb')
    expect(block && isPlaceholder(block)).toBe(false)
  })

  it('names a recorded fence with no command, a bad AE, or no close', () => {
    expect(readRecordedStory(`## Scene\n${FENCE}recorded\nx\n${FENCE}\n`).problems).toEqual([
      {
        line: 2,
        message: 'expected "```recorded <command>", "```recorded@<ae> <command>", or either with "recorded!"',
      },
    ])
    expect(readRecordedStory(`## Scene\n${FENCE}recorded@Archive ls\nx\n${FENCE}\n`).problems).toHaveLength(1)
    expect(readRecordedStory(`## Scene\n${FENCE}recorded ls\nx\n`).problems).toEqual([
      { line: 2, message: 'this recorded block is never closed with ```' },
    ])
  })

  it('reads recorded! as a block whose command prints nothing, with or without an AE', () => {
    const { blocks } = readRecordedStory(
      `## Scene\n${FENCE}recorded! cp a b\n${FENCE}\n${FENCE}recorded!@archive true\n${FENCE}\n`
    )
    expect(blocks.map((block) => [block.ae, block.command, block.expectsEmpty, block.body])).toEqual([
      [null, 'cp a b', true, ''],
      ['archive', 'true', true, ''],
    ])
  })

  it('does not read "recordedfoo" as a recorded block', () => {
    const story = readRecordedStory(`## Scene\n${FENCE}recordedfoo ls\nx\n${FENCE}\n`)
    expect(story.blocks).toEqual([])
    expect(story.problems).toEqual([])
  })
})

describe('askedCommands', () => {
  it('takes the spans the line asks for, as the Guide reads them', () => {
    expect(askedCommands('**The Preamble:** Type `hexdump -C /lab/ct.dcm`.')).toEqual(['hexdump -C /lab/ct.dcm'])
    expect(askedCommands('Look again: `ls /lab`.')).toEqual(['ls /lab'])
    expect(askedCommands('`ls /lab` again.')).toEqual(['ls /lab'])
    expect(askedCommands('Type `cp a b`. Then `ls`.')).toEqual(['cp a b', 'ls'])
  })

  it('passes over spans the line only names, files to open in the inspector, and prompts', () => {
    expect(askedCommands('The four bytes `DICM` sit at `128`, after `-C` showed them.')).toEqual([])
    expect(askedCommands('As `hexdump` showed, the file starts empty.')).toEqual([])
    expect(askedCommands('Open `/lab/ct-implicit-le.dcm` in the File inspector.')).toEqual([])
    expect(askedCommands('A second file came in with the first: `/lab/ct-implicit-le.dcm`. Whoever sent it…')).toEqual(
      []
    )
    expect(askedCommands('Type `workstation:~#`')).toEqual([])
  })
})

describe('recordPlan', () => {
  it('runs the player’s commands before each block, in the console AE, and the block in its own', () => {
    const plan = recordPlan(readRecordedStory(STORY), 'workstation')
    expect(
      plan.map((step) =>
        step.kind === 'type' ? `type ${step.ae}: ${step.command}` : `record ${step.ae}: ${step.block.command}`
      )
    ).toEqual([
      'record workstation: hexdump -C /lab/ct.dcm | head -n 3',
      'type workstation: cp /lab/ct.dcm /lab/copy.dcm',
      'record archive: ls /lab',
    ])
  })

  it('runs a typed command that is not the block’s own, and leaves out commands after the last block', () => {
    const story = readRecordedStory(
      `## Scene\nType \`touch /lab/a\`.\nType \`touch /lab/b\`.\n${FENCE}recorded ls /lab\nx\n${FENCE}\nType \`rm /lab/a\`.\n`
    )
    expect(recordPlan(story, 'workstation')).toEqual([
      { kind: 'type', ae: 'workstation', command: 'touch /lab/a', line: 2 },
      { kind: 'type', ae: 'workstation', command: 'touch /lab/b', line: 3 },
      { kind: 'record', ae: 'workstation', block: story.blocks[0] },
    ])
  })

  it('is empty for a story with no recorded block', () => {
    expect(recordPlan(readRecordedStory('## Scene\nType `ls`.\n'), 'workstation')).toEqual([])
  })
})

describe('replaceRecordedBodies', () => {
  it('replaces the bodies it is given and keeps the info string and everything else', () => {
    const replaced = replaceRecordedBodies(STORY, new Map([[11, '00000000  00 00\n*']]))
    expect(replaced).toBe(
      STORY.replace(
        `${FENCE}recorded hexdump -C /lab/ct.dcm | head -n 3\n(recorded on the Machine)`,
        `${FENCE}recorded hexdump -C /lab/ct.dcm | head -n 3\n00000000  00 00\n*`
      )
    )
    const again = readRecordedStory(replaced)
    expect(again.blocks.map((block) => block.body)).toEqual(['00000000  00 00\n*', '(recorded on the Machine)'])
  })

  it('writes an empty output as a block with no lines', () => {
    expect(replaceRecordedBodies(`${FENCE}recorded true\nx\ny\n${FENCE}\n`, new Map([[1, '']]))).toBe(
      `${FENCE}recorded true\n${FENCE}\n`
    )
  })

  it('never writes into a plain code block, even at a line it is given', () => {
    const story = `${FENCE}\ngo-dicom show ct.dcm\n${FENCE}\n`
    expect(replaceRecordedBodies(story, new Map([[1, 'nope']]))).toBe(story)
  })

  it('keeps CRLF line endings', () => {
    expect(replaceRecordedBodies(`a\r\n${FENCE}recorded ls\r\nx\r\n${FENCE}\r\n`, new Map([[2, 'b\nc']]))).toBe(
      `a\r\n${FENCE}recorded ls\r\nb\r\nc\r\n${FENCE}\r\n`
    )
  })

  it('reads its own output back the same', () => {
    const once = replaceRecordedBodies(STORY, new Map([[23, 'ct.dcm\ncopy.dcm']]))
    expect(replaceRecordedBodies(once, new Map([[23, 'ct.dcm\ncopy.dcm']]))).toBe(once)
  })
})

describe('emptinessProblem', () => {
  const [shows, silent] = readRecordedStory(
    `## Scene\n${FENCE}recorded hexdump -C /lab/ct.dcm | head -n 10\nx\n${FENCE}\n${FENCE}recorded! cp a b\n${FENCE}\n`
  ).blocks
  if (!shows || !silent) {
    throw new Error('expected two blocks')
  }

  it('refuses an empty recording for a block that shows output', () => {
    expect(emptinessProblem(shows, '')).toMatch(/printed nothing; write the block as ```recorded!/)
    expect(emptinessProblem(shows, '00000000  00 00')).toBeNull()
  })

  it('takes an empty recording for a recorded! block, and refuses output there', () => {
    expect(emptinessProblem(silent, '')).toBeNull()
    expect(emptinessProblem(silent, 'cp: a: No such file')).toMatch(/printed output/)
  })
})

describe('unsafeBody', () => {
  it('refuses output with a line that would close the block', () => {
    expect(unsafeBody('a\n```\nb')).toMatch(/close the block/)
    expect(unsafeBody('a `x` ```')).toBeNull()
  })
})
