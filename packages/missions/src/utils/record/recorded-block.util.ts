import type { StoryProblem } from '#types/definitions/story'
import { slugify } from '#utils/story/story.util'

/** What a writer leaves in a `recorded` block until the recorder fills it with the Machine's output. */
export const RECORDED_PLACEHOLDER = '(recorded on the Machine)'

/** The section whose commands run on the player's own computer, never on the Machine. */
export const OWN_MACHINE_SECTION = 'real-world'

const FENCE = /^```/
const RECORDED_OPENER = /^```recorded(?=[!@\s]|$)/
const RECORDED_FENCE = /^```recorded(!)?(?:@([a-z](?:[a-z0-9-]{0,14}[a-z0-9])?))?[ \t]+(\S(?:.*\S)?)\s*$/
const SECTION_HEADING = /^##\s+(.+?)\s*$/
const QUOTE_PREFIX = /^>\s?/

// The Guide's reading of which span a line asks the player to type (apps/web's
// guide-command.constants), so the recorder runs the commands the Guide waits for. Two parts are
// left out: "open" asks for a file in the File inspector, not the console, and a bare path
// (`/lab/ct.dcm`) names a file; neither is a line the player types.
const CODE_SPAN = /`([^`]+)`/g
const ASKING_WORD = /(?:^|[\s(])(?:type|Type|run|Run|Now|Then|And|First|with|Try)\s*$/
const INTRODUCING_MARK = /[:,]\s*$/
const ENDS_THE_ASK = /^(?:[.!]|\s*$|,\s*then\b)/
const SENTENCE_START = /(?:^|[.!?]\s+)$/
const SENTENCE_OF_ITS_OWN = /^(?:[.,!]|\s+again\b)/
const LOOKS_TYPED = /^[a-z][\w.-]*(?:\s|$)/
const PROMPT_LIKE = /[#>]$/

/** A fenced block whose body is the Machine's output for the command in its info string. */
export interface RecordedBlock {
  /** The opening fence's line, from 1: what names the block in the recorder's report. */
  readonly line: number
  /** The AE named by `recorded@<ae>`; null for the lab's console AE. */
  readonly ae: string | null
  readonly command: string
  /** Written `recorded!`: the command prints nothing, and an empty body is its true output. */
  readonly expectsEmpty: boolean
  /** Everything between the fences, newlines kept, no trailing newline. */
  readonly body: string
  /** The slug of the section it is in; null before the first one. */
  readonly section: string | null
}

/** A command the guide asks the player to type: `Type \`cp a b\`.` */
export interface TypedCommand {
  readonly line: number
  readonly command: string
  readonly section: string | null
}

export interface RecordedStory {
  readonly blocks: readonly RecordedBlock[]
  /** In story order, Real world left out: its commands are for the player's own computer. */
  readonly typed: readonly TypedCommand[]
  readonly problems: readonly StoryProblem[]
}

const isAsked = (line: string, start: number, end: number): boolean => {
  const before = line.slice(0, start)
  const after = line.slice(end)
  return (
    ASKING_WORD.test(before) ||
    (INTRODUCING_MARK.test(before) && ENDS_THE_ASK.test(after)) ||
    (SENTENCE_START.test(before) && SENTENCE_OF_ITS_OWN.test(after))
  )
}

/**
 * The spans a line asks the player to type, in order: "Type `ls /lab`", "Look again: `ls /lab`.",
 * "`ls /lab` again.". A span the line only names (`DICM`, `(0002,0010)`, `-C`, `/lab/ct.dcm`) is
 * passed over.
 */
export function askedCommands(line: string): string[] {
  return [...line.matchAll(CODE_SPAN)].flatMap((match) => {
    const span = (match[1] ?? '').trim()
    const start = match.index ?? 0
    const asked = LOOKS_TYPED.test(span) && !PROMPT_LIKE.test(span) && isAsked(line, start, start + match[0].length)
    return asked ? [span] : []
  })
}

/** True while the block still holds what the writer left, not a recording. */
export const isPlaceholder = (block: RecordedBlock): boolean => block.body.trim() === RECORDED_PLACEHOLDER

/**
 * Reads the `recorded` blocks of a story.md and the commands its guide asks the player to type,
 * each with its line. A `recorded` fence without a command, or one never closed, is a problem.
 */
export function readRecordedStory(markdown: string): RecordedStory {
  const blocks: RecordedBlock[] = []
  const typed: TypedCommand[] = []
  const problems: StoryProblem[] = []
  let section: string | null = null
  let open: { line: number; ae: string | null; command: string | null; empty: boolean; body: string[] } | null = null

  markdown.split(/\r?\n/).forEach((raw, index) => {
    const line = index + 1
    if (open) {
      if (!FENCE.test(raw)) {
        open.body.push(raw)
        return
      }
      if (open.command !== null) {
        blocks.push({
          line: open.line,
          ae: open.ae,
          command: open.command,
          expectsEmpty: open.empty,
          body: open.body.join('\n'),
          section,
        })
      }
      open = null
      return
    }
    if (FENCE.test(raw)) {
      const recorded = RECORDED_FENCE.exec(raw)
      if (recorded?.[3] !== undefined) {
        open = { line, ae: recorded[2] ?? null, command: recorded[3], empty: recorded[1] === '!', body: [] }
      } else {
        if (RECORDED_OPENER.test(raw)) {
          problems.push({
            line,
            message: 'expected "```recorded <command>", "```recorded@<ae> <command>", or either with "recorded!"',
          })
        }
        open = { line, ae: null, command: null, empty: false, body: [] }
      }
      return
    }
    const heading = SECTION_HEADING.exec(raw)
    if (heading?.[1]) {
      section = slugify(heading[1])
      return
    }
    if (section === OWN_MACHINE_SECTION) {
      return
    }
    for (const command of askedCommands(raw.replace(QUOTE_PREFIX, ''))) {
      typed.push({ line, command, section })
    }
  })
  // The variable is assigned inside the callback, so its narrowed type is lost here.
  const unclosed = open as { line: number; command: string | null } | null
  if (unclosed?.command != null) {
    problems.push({ line: unclosed.line, message: 'this recorded block is never closed with ```' })
  }
  return { blocks, typed, problems }
}

/** One thing the recorder does at the console, in story order. */
export type RecordStep =
  /** A command the player types before an output block: run for the state it leaves, never written. */
  | { readonly kind: 'type'; readonly ae: string; readonly command: string; readonly line: number }
  /** A `recorded` block: run, and its output becomes the block's body. */
  | { readonly kind: 'record'; readonly ae: string; readonly block: RecordedBlock }

/**
 * What to run for a story, in order: the player's commands since the last block, in the console
 * AE, then the block's own command in its AE. Commands after the last block are left out, since no
 * output follows them. The guide's "Type `x`" right before x's own block is one run, not two: a
 * command that changes the lab would otherwise change it twice.
 */
export function recordPlan(story: RecordedStory, consoleAe: string): RecordStep[] {
  const steps: RecordStep[] = []
  let pending: TypedCommand[] = []
  const byLine = [
    ...story.typed.map((typed) => ({ at: typed.line, typed })),
    ...story.blocks.map((block) => ({ at: block.line, block })),
  ]
  byLine.sort((first, second) => first.at - second.at)
  for (const entry of byLine) {
    if ('typed' in entry) {
      pending.push(entry.typed)
      continue
    }
    const { block } = entry
    if (pending.at(-1)?.command === block.command) {
      pending = pending.slice(0, -1)
    }
    steps.push(
      ...pending.map((typed) => ({ kind: 'type' as const, ae: consoleAe, command: typed.command, line: typed.line }))
    )
    pending = []
    steps.push({ kind: 'record', ae: block.ae ?? consoleAe, block })
  }
  return steps
}

/**
 * Why an output cannot be the block's recording, by whether the block expects one: every output
 * block shows something, so an empty one means the console lost the command or its output. A block
 * written `recorded!` is for a command that truly prints nothing, and then output is the surprise.
 */
export function emptinessProblem(block: RecordedBlock, output: string): string | null {
  if (output === '' && !block.expectsEmpty) {
    return 'it printed nothing; write the block as ```recorded! if the command really prints nothing'
  }
  if (output !== '' && block.expectsEmpty) {
    return 'the block is written ```recorded! (prints nothing), but the command printed output'
  }
  return null
}

/** Why `body` cannot go between a block's fences: a line starting with ``` would close it early. */
export function unsafeBody(body: string): string | null {
  return body.split('\n').some((line) => FENCE.test(line))
    ? 'the output has a line starting with ```, which would close the block early'
    : null
}

/**
 * The story with each block whose opening line is in `bodies` given that body. The info string
 * stays, so the next run can record the block again; everything else is left byte for byte.
 */
export function replaceRecordedBodies(markdown: string, bodies: ReadonlyMap<number, string>): string {
  const newline = markdown.includes('\r\n') ? '\r\n' : '\n'
  const lines = markdown.split(/\r?\n/)
  const out: string[] = []
  for (let at = 0; at < lines.length; at++) {
    const line = lines[at] ?? ''
    out.push(line)
    const body = bodies.get(at + 1)
    if (!FENCE.test(line)) {
      continue
    }
    let close = at + 1
    while (close < lines.length && !FENCE.test(lines[close] ?? '')) {
      close++
    }
    if (body !== undefined && RECORDED_FENCE.test(line) && close < lines.length) {
      out.push(...(body === '' ? [] : body.split('\n')))
    } else {
      out.push(...lines.slice(at + 1, close))
    }
    if (close < lines.length) {
      out.push(lines[close] ?? '')
    }
    at = close
  }
  return out.join(newline)
}
