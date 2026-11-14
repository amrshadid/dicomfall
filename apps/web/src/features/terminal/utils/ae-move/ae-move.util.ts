import { VM_HOSTNAME } from '@dicomfall/machine/types'
import { DIM, RESET } from '@features/terminal/utils/vm/vm-status.constants'

/**
 * Console text on its way to the screen, with the move into an AE said in words. The Machine's own
 * shell (`dicomfall:~# `) is the one the lab is built from; the console leaves it for the lab's AE
 * as soon as the lab is up, and its prompt alone on a line reads as a shell the player should use.
 */
export interface AeMoveFilter {
  /** Takes console text and returns what to show now; a prompt still arriving is held back. */
  readonly write: (text: string) => string
  /** Shows a held Machine prompt that no AE's prompt followed, as when a lab fails to build. */
  readonly flush: () => string
  /** Forgets what was held: the screen it belonged to was cleared. The last AE is kept. */
  readonly reset: () => void
}

const ESC = '\u001b'
const BEL = '\u0007'
/** bash's prompt, `<ae>:\w# ` (packages/machine's df-bashrc): the path starts at `~` or `/`. */
const PROMPT = /^([a-z][a-z0-9-]*):[~/][^\r\n]*# $/
/** What can still grow into a prompt. */
const PROMPT_START = /^[a-z][a-z0-9-]*(:([~/][^\r\n]*)?)?$/
/** No prompt is longer; a line that is can be shown at once. */
const LONGEST_PROMPT = 160

/** The one line the console prints when it moves into an AE. */
export const aeMoveLine = (ae: string): string => `${DIM}Console moved into AE ${ae}${RESET}\r\n`

/** The text a terminal shows of `held`, escape sequences left out; `incomplete` while one is cut off. */
export function visibleOf(held: string): { readonly text: string; readonly incomplete: boolean } {
  let text = ''
  let at = 0
  while (at < held.length) {
    const char = held[at] ?? ''
    if (char !== ESC) {
      text += char
      at++
      continue
    }
    const kind = held[at + 1]
    if (kind === undefined) {
      return { text, incomplete: true }
    }
    if (kind === '[') {
      let end = at + 2
      while (end < held.length && !/[@-~]/.test(held[end] ?? '')) {
        end++
      }
      if (end >= held.length) {
        return { text, incomplete: true }
      }
      at = end + 1
    } else if (kind === ']') {
      const bel = held.indexOf(BEL, at + 2)
      const st = held.indexOf(`${ESC}\\`, at + 2)
      const end = bel === -1 ? st : st === -1 ? bel : Math.min(bel, st)
      if (end === -1) {
        return { text, incomplete: true }
      }
      at = end + (end === st ? 2 : 1)
    } else {
      at += 2
    }
  }
  return { text, incomplete: false }
}

const isNewline = (char: string) => char === '\n' || char === '\r'

/**
 * A filter for the console's text. Each prompt that starts a line is looked at as it arrives: the
 * Machine's own is held back; an AE's prompt in another AE than the last is shown after one dim
 * line, "Console moved into AE workstation", and a held Machine prompt before it is dropped.
 * Everything else passes as it came, escape sequences included.
 */
export function createAeMoveFilter(machine: string = VM_HOSTNAME): AeMoveFilter {
  let atStart = true
  let held = ''
  let pending: string | null = null
  let tail = ''
  let last: string | null = null

  const release = (): string => {
    const out = (pending ?? '') + tail
    pending = null
    tail = ''
    return out
  }

  const write = (text: string): string => {
    let out = ''
    for (const char of text) {
      if (!atStart) {
        out += char
        atStart = isNewline(char)
        continue
      }
      // A held Machine prompt keeps the line breaks after it, in case an AE's prompt follows.
      if (pending !== null && held === '' && isNewline(char)) {
        tail += char
        continue
      }
      held += char
      const { text: shown, incomplete } = visibleOf(held)
      if (incomplete || shown === '') {
        continue
      }
      const prompt = PROMPT.exec(shown)
      if (prompt !== null) {
        const name = prompt[1] ?? ''
        if (name === machine) {
          out += release()
          pending = held
          last = machine
        } else {
          pending = null
          tail = ''
          if (name !== last) {
            out += aeMoveLine(name)
          }
          out += held
          last = name
          atStart = false
        }
        held = ''
        continue
      }
      if (PROMPT_START.test(shown) && shown.length <= LONGEST_PROMPT) {
        continue
      }
      out += release() + held
      atStart = isNewline(char)
      held = ''
    }
    return out
  }

  return {
    write,
    flush: () => {
      if (pending === null) {
        return ''
      }
      const out = release()
      atStart = false
      return out
    },
    reset: () => {
      atStart = true
      held = ''
      pending = null
      tail = ''
    },
  }
}
