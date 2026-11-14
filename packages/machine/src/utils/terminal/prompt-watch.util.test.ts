import { describe, expect, it } from 'vitest'
import { EMPTY_PROMPT_WATCH, type PromptWatch, watchInput, watchOutput } from '#utils/terminal/prompt-watch.util'

// The chunks are the console's bytes as bash 5 with bracketed paste writes them, split as the
// session flushes them, in the AE workstation.
const PROMPT = 'workstation:~# '
const AT_PROMPT = watchOutput(EMPTY_PROMPT_WATCH, `\u001b[?2004h${PROMPT}`).watch

/** The keys, then the output in its chunks; how many commands each chunk finished. */
function play(start: PromptWatch, keys: string, chunks: readonly string[]): { watch: PromptWatch; finished: number[] } {
  let watch = watchInput(start, keys)
  const finished: number[] = []
  for (const chunk of chunks) {
    const result = watchOutput(watch, chunk)
    watch = result.watch
    finished.push(result.finished)
  }
  return { watch, finished }
}

describe('a command finished at the console', () => {
  it('counts bash coming back to its prompt after Enter', () => {
    const { finished, watch } = play(AT_PROMPT, 'echo hi\r', [`echo hi\r\n\u001b[?2004l\rhi\r\n\u001b[?2004h${PROMPT}`])
    expect(finished).toEqual([1])
    expect(watch.pending).toBe(0)
  })

  it('counts a prompt split across two chunks once', () => {
    expect(play(AT_PROMPT, '\r', ['\r\n\u001b[?2004l\r\u001b[?2004hwork', 'station:~# ']).finished).toEqual([0, 1])
  })

  it('counts the prompt of an AE whose name has a hyphen, in any folder', () => {
    const { finished } = play(AT_PROMPT, 'cd /lab\r', ['cd /lab\r\n\u001b[?2004l\r\u001b[?2004hct-scanner:/lab# '])
    expect(finished).toEqual([1])
  })

  it('counts both commands when the second was typed while the first ran', () => {
    let watch = watchInput(AT_PROMPT, 'sleep 2\r')
    watch = watchOutput(watch, 'sleep 2\r\n\u001b[?2004l\r').watch
    watch = watchInput(watch, 'echo ahead\r')
    // The tty echoes the keys at once; readline shows them again after the first prompt.
    const echoed = watchOutput(watch, 'echo ahead\r\n')
    expect(echoed.finished).toBe(0)
    const done = watchOutput(
      echoed.watch,
      `\u001b[?2004h${PROMPT}echo ahead\r\n\u001b[?2004l\rahead\r\n\u001b[?2004h${PROMPT}`
    )
    expect(done.finished).toBe(2)
    expect(done.watch.pending).toBe(0)
  })

  it('counts a command stopped with Ctrl-C', () => {
    let watch = play(AT_PROMPT, 'sleep 30\r', ['sle', 'ep 30\r\n\u001b[?2004l\r']).watch
    watch = watchInput(watch, '\u0003')
    expect(play(watch, '', ['^C', `\r\n\u001b[?2004h${PROMPT}`]).finished).toEqual([0, 1])
  })

  it('counts nothing for keys without Enter: Tab redraws the line', () => {
    const { finished } = play(AT_PROMPT, 'ls /lab/fi\t', ['ls /lab/fi', 'xtures/'])
    expect(finished).toEqual([0, 0])
  })

  it('counts output that ends like a prompt once, with the real prompt that follows on the line', () => {
    const { finished, watch } = play(AT_PROMPT, "printf 'x:y# '\r", [
      `printf 'x:y# '\r\n\u001b[?2004l\rx:y# \u001b[?2004h${PROMPT}`,
    ])
    expect(finished).toEqual([1])
    expect(watch.pending).toBe(0)
  })

  it('takes a line that is no bash prompt for output, whatever it ends with', () => {
    const { finished, watch } = play(AT_PROMPT, 'cat notes\r', ['cat notes\r\n\u001b[?2004l\rarchive# \r\n'])
    expect(finished).toEqual([0])
    expect(watch.pending).toBe(1)
  })

  it('counts nothing when no Enter was pressed: the Machine’s own newline after a restore', () => {
    expect(watchOutput(AT_PROMPT, `\r\n\u001b[?2004h${PROMPT}`).finished).toBe(0)
  })

  it('waits for the Enter to reach the screen: readline redrawing the line first is not the prompt', () => {
    const typing = watchOutput(AT_PROMPT, 'ls /lab').watch
    // Ctrl-U, then exit and Enter: readline draws the prompt again before the newline.
    const { finished } = play(typing, '\u0015exit\r', [`\r${PROMPT}\u001b[Kexit\r\n`, `\u001b[?2004h${PROMPT}`])
    expect(finished).toEqual([0, 1])
  })

  it('counts a pasted block of lines as one command per line', () => {
    expect(watchInput(AT_PROMPT, 'echo one\recho two\r').pending).toBe(2)
    expect(watchInput(AT_PROMPT, 'echo one\r\n').pending).toBe(1)
  })
})

/** Plays each step's keys and chunks in turn; the command lines each step finished. */
function linesOf(start: PromptWatch, steps: readonly (readonly [string, readonly string[]])[]): string[][] {
  let watch = start
  return steps.map(([keys, chunks]) => {
    watch = watchInput(watch, keys)
    const lines: string[] = []
    for (const chunk of chunks) {
      const result = watchOutput(watch, chunk)
      watch = result.watch
      lines.push(...result.lines)
    }
    return lines
  })
}

describe('the command line a finished command was typed as', () => {
  it('is the line as it showed at Enter, prompt included', () => {
    expect(
      linesOf(AT_PROMPT, [
        ['ls -l /lab\r', ['ls -l /lab\r\n\u001b[?2004l\r', `total 0\r\n\u001b[?2004h${PROMPT}`]],
        ['pwd\r', ['pwd\r\n\u001b[?2004l\r/root\r\n', `\u001b[?2004h${PROMPT}`]],
      ])
    ).toEqual([['workstation:~# ls -l /lab'], ['workstation:~# pwd']])
  })

  it('holds what Tab completed', () => {
    expect(
      linesOf(AT_PROMPT, [
        ['ls /lab/fi\t', ['ls /lab/fi', 'xtures/']],
        ['\r', ['\r\n\u001b[?2004l\r', `ct-explicit-le.dcm\r\n\u001b[?2004h${PROMPT}`]],
      ])
    ).toEqual([[], ['workstation:~# ls /lab/fixtures/']])
  })

  it('has the backspaces applied', () => {
    expect(
      linesOf(AT_PROMPT, [['lsx\b\b /lab\r', ['lsx\b \b\b \b', 's /lab\r\n\u001b[?2004l\r', `\u001b[?2004h${PROMPT}`]]])
    ).toEqual([['workstation:~# ls /lab']])
  })

  it('leaves out the bell rung for a Backspace on an empty line', () => {
    expect(
      linesOf(AT_PROMPT, [['\b\b\bpwd\r', ['\u0007\u0007\u0007', 'pwd\r\n\u001b[?2004l\r', `\u001b[?2004h${PROMPT}`]]])
    ).toEqual([['workstation:~# pwd']])
  })

  it('is the line readline drew again after Ctrl-U', () => {
    const typing = watchOutput(AT_PROMPT, 'ls /lab').watch
    expect(linesOf(typing, [['\u0015exit\r', [`\r${PROMPT}\u001b[Kexit\r\n`, `\u001b[?2004h${PROMPT}`]]])).toEqual([
      ['workstation:~# exit'],
    ])
  })

  it('keeps each of two commands, the second typed while the first ran', () => {
    let watch = watchInput(AT_PROMPT, 'sleep 2\r')
    watch = watchOutput(watch, 'sleep 2\r\n\u001b[?2004l\r').watch
    watch = watchInput(watch, 'echo ahead\r')
    watch = watchOutput(watch, 'echo ahead\r\n').watch
    const done = watchOutput(
      watch,
      `\u001b[?2004h${PROMPT}echo ahead\r\n\u001b[?2004l\rahead\r\n\u001b[?2004h${PROMPT}`
    )
    expect(done.lines).toEqual(['workstation:~# sleep 2', 'workstation:~# echo ahead'])
  })
})
