// biome-ignore-all lint/suspicious/noControlCharactersInRegex: these patterns exist to match the console's control characters

// OSC (window titles), CSI (colours, cursor moves, bracketed paste), then the two-byte escapes.
const OSC = /\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)/g
const CSI = /\x1b\[[0-?]*[ -/]*[@-~]/g
const CHARSET = /\x1b[()*+][0-~]/g
const SHORT_ESCAPE = /\x1b[@-_=>78]/g
// What is left that a page cannot show: every C0 control but tab and newline, and DEL.
const OTHER_CONTROLS = /[\x00-\x08\x0b-\x1f\x7f]/g
/** bash's prompt in an AE, `workstation:~# ` (PS1 is `<ae>:\w# `), at the end of the output. */
const trailingPrompt = (ae: string): RegExp => new RegExp(`${ae.replace(/[^a-z0-9]/g, '\\$&')}:[~/][^#\\n]*# ?$`)

/** The text without escape sequences: colours, cursor moves and titles go, characters stay. */
function stripEscapes(text: string): string {
  return text.replace(OSC, '').replace(CSI, '').replace(CHARSET, '').replace(SHORT_ESCAPE, '')
}

/**
 * One line as the terminal leaves it: a `\r` moves back to the line's start and what follows
 * writes over it, a backspace steps back one character.
 */
function drawLine(line: string): string {
  let screen: string[] = []
  let cursor = 0
  for (const char of line) {
    if (char === '\r') {
      cursor = 0
    } else if (char === '\b') {
      cursor = Math.max(0, cursor - 1)
    } else {
      screen[cursor] = char
      cursor++
    }
  }
  screen = Array.from(screen, (char) => char ?? ' ')
  return screen.join('')
}

/** Lines drawn, `\r\n` read as one newline, then whatever control character is left dropped. */
function drawLines(text: string): string {
  return text
    .replace(/\r+\n/g, '\n')
    .split('\n')
    .map((line) => drawLine(line).replace(OTHER_CONTROLS, ''))
    .join('\n')
}

/** What the console showed, as plain text: no escape sequences, `\r` and backspaces applied. */
export function stripTerminalCodes(text: string): string {
  return drawLines(stripEscapes(text))
}

const squeeze = (text: string): string => text.replace(/[\r\n ]/g, '')

/**
 * Where the echo of the typed line ends: readline may break a long line with `\r` or a newline
 * where the console wraps it, so the echo ends at the first newline by which every character of
 * the command has shown.
 */
function afterEcho(text: string, command: string): string {
  const wanted = squeeze(command)
  let at = text.indexOf('\n')
  while (at !== -1) {
    if (squeeze(text.slice(0, at)).endsWith(wanted)) {
      return text.slice(at + 1)
    }
    at = text.indexOf('\n', at + 1)
  }
  // No echo found: the whole capture is output, which the run log shows as it is.
  return text
}

/**
 * A command's output, from everything the console in `ae` showed after the command was typed: the
 * echoed line and the next prompt left out, control sequences stripped, each line's trailing spaces
 * and the trailing blank lines dropped. The AE's name tells its prompt from output that ends
 * without a newline.
 */
export function commandOutput(shown: string, command: string, ae: string): string {
  const lines = drawLines(afterEcho(stripEscapes(shown), command)).split('\n')
  const last = lines.length - 1
  lines[last] = (lines[last] ?? '').replace(trailingPrompt(ae), '')
  const trimmed = lines.map((line) => line.trimEnd())
  while (trimmed.length > 0 && trimmed.at(-1) === '') {
    trimmed.pop()
  }
  return trimmed.join('\n')
}
