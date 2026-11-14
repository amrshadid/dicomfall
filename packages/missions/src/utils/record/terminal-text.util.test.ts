import { describe, expect, it } from 'vitest'
import { commandOutput, stripTerminalCodes } from '#utils/record/terminal-text.util'

const ESC = '\u001b'

describe('stripTerminalCodes', () => {
  it('drops colours, cursor moves, bracketed paste and titles', () => {
    expect(stripTerminalCodes(`${ESC}[?2004h${ESC}[1;31mred${ESC}[0m ${ESC}[K${ESC}]0;title\u0007x${ESC}(B`)).toBe(
      'red x'
    )
  })

  it('applies carriage returns and backspaces as the terminal does', () => {
    expect(stripTerminalCodes('10%\r50%\r100%\r\ndone')).toBe('100%\ndone')
    expect(stripTerminalCodes('abc\b\bX')).toBe('aXc')
  })

  it('drops the bell and other controls, keeps tabs', () => {
    expect(stripTerminalCodes('a\u0007\tb\u0000')).toBe('a\tb')
  })
})

describe('commandOutput', () => {
  const PROMPT = 'workstation:~# '

  it('leaves out the echoed line and the next prompt', () => {
    const shown = `hexdump -C /lab/ct.dcm | head -n 3\r\n00000000  00 00\r\n*\r\n00000080  44 49 43 4d\r\n${ESC}[?2004h${PROMPT}`
    expect(commandOutput(shown, 'hexdump -C /lab/ct.dcm | head -n 3', 'workstation')).toBe(
      '00000000  00 00\n*\n00000080  44 49 43 4d'
    )
  })

  it('finds the echo of a long line that readline wrapped', () => {
    const command = 'ls -l /lab/a-long-folder-name /lab/another-long-folder-name'
    const wrapped = `ls -l /lab/a-long-folder-name /lab/anot\r\nher-long-folder-name\r\n`
    expect(commandOutput(`${wrapped}total 0\r\n${PROMPT}`, command, 'workstation')).toBe('total 0')
    expect(
      commandOutput(
        `ls -l /lab/a-long-folder-name /lab/anot \rher-long-folder-name\r\ntotal 0\r\n${PROMPT}`,
        command,
        'workstation'
      )
    ).toBe('total 0')
  })

  it('is empty for a command that printed nothing', () => {
    expect(commandOutput(`true\r\n${PROMPT}`, 'true', 'workstation')).toBe('')
  })

  it('keeps output that did not end its line, without the prompt after it', () => {
    expect(commandOutput(`printf x\r\nx${PROMPT}`, 'printf x', 'workstation')).toBe('x')
  })

  it('drops trailing spaces and blank lines, keeps blank lines inside', () => {
    expect(commandOutput(`cmd\r\na  \r\n\r\nb\r\n\r\n${PROMPT}`, 'cmd', 'workstation')).toBe('a\n\nb')
  })

  it('strips colours from the output', () => {
    expect(commandOutput(`ls\r\n${ESC}[1;34mlab${ESC}[0m\r\n${PROMPT}`, 'ls', 'workstation')).toBe('lab')
  })
})
