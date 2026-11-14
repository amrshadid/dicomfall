import type { GuideBeat } from '@features/guide/types'
import {
  ASKING_WORD,
  CODE_SPAN,
  ENDS_THE_ASK,
  INTRODUCING_MARK,
  LEADING_PROMPT,
  LOOKS_TYPED,
  PROMPT_LIKE,
  QUOTES,
  SENTENCE_OF_ITS_OWN,
  SENTENCE_START,
} from './guide-command.constants'

const wordsOf = (line: string): string[] => line.replace(QUOTES, '').trim().split(/\s+/).filter(Boolean)

/** The text of a beat, one entry per line of the story, the question's included. */
export function beatLinesOf(beat: GuideBeat): readonly string[] {
  return beat.flatMap((part) =>
    part.kind === 'lines' ? part.lines.map((line) => line.text) : part.kind === 'predict' ? [part.line.text] : []
  )
}

const isAsked = (line: string, start: number, end: number): boolean => {
  const before = line.slice(0, start)
  const after = line.slice(end)
  if (ASKING_WORD.test(before)) {
    return true
  }
  if (INTRODUCING_MARK.test(before) && ENDS_THE_ASK.test(after)) {
    return true
  }
  return SENTENCE_START.test(before) && SENTENCE_OF_ITS_OWN.test(after)
}

/**
 * The command a line of the story asks the player to type: the last span in backticks that the
 * sentence asks for ("type `ls /lab`", "Look at it: `go-dicom show /lab/ct.dcm`."). A span the
 * line only names (`DICM`, `(0002,0010)`, `workstation:~#`) is passed over; null when none is asked.
 */
export function askedCommandOf(line: string): string | null {
  let asked: string | null = null
  for (const match of line.matchAll(CODE_SPAN)) {
    const span = (match[1] ?? '').trim()
    const start = match.index ?? 0
    if (LOOKS_TYPED.test(span) && !PROMPT_LIKE.test(span) && isAsked(line, start, start + match[0].length)) {
      asked = span
    }
  }
  return asked
}

/** The command each beat asks for before its pause, or null where it asks for none the Guide can name. */
export function beatCommandsOf(beats: readonly GuideBeat[]): readonly (string | null)[] {
  return beats.map((beat) =>
    beatLinesOf(beat).reduce<string | null>((last, line) => askedCommandOf(line) ?? last, null)
  )
}

/**
 * Whether a finished command line releases the pause after a beat that asked for `expected`.
 * The words must be the same, in the same number; quotes and a prompt in front are ignored, case
 * is not, since the shell takes no word cut short. Failed lines count: a beat may ask for a
 * command that fails to show the error. A beat that asks for nothing is released by any command,
 * and so is every beat while the Machine does not say what was typed (`typed` undefined). A line
 * ending in `?` never runs, so only Continue releases its beat.
 */
export function releasesPause(expected: string | null, typed: string | undefined): boolean {
  if (expected?.endsWith('?')) {
    return false
  }
  if (expected === null || typed === undefined) {
    return true
  }
  const want = wordsOf(expected)
  const got = wordsOf(typed.trimStart().replace(LEADING_PROMPT, ''))
  return got.length === want.length && got.every((word, at) => word === want[at])
}
