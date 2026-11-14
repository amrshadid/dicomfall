import { describe, expect, it } from 'vitest'
import { aeMoveLine, createAeMoveFilter, visibleOf } from './ae-move.util'

const PASTE_ON = '\x1b[?2004h'

describe('visibleOf', () => {
  it('leaves escape sequences out of what a terminal shows, and says when one is cut off', () => {
    expect(visibleOf(`${PASTE_ON}workstation:~# `)).toEqual({ text: 'workstation:~# ', incomplete: false })
    expect(visibleOf('\x1b]0;title\x07ab')).toEqual({ text: 'ab', incomplete: false })
    expect(visibleOf('\x1b[?20')).toEqual({ text: '', incomplete: true })
  })
})

describe('createAeMoveFilter', () => {
  it("drops the Machine's bare prompt and says the move into the AE in one dim line", () => {
    const filter = createAeMoveFilter('dicomfall')
    expect(filter.write(`${PASTE_ON}dicomfall:~# `)).toBe('')
    expect(filter.write(`\r\n${PASTE_ON}workstation:~# `)).toBe(
      `${aeMoveLine('workstation')}${PASTE_ON}workstation:~# `
    )
  })

  it('works on prompts that arrive a few bytes at a time', () => {
    const filter = createAeMoveFilter('dicomfall')
    const out = [...'dicomfall:~# workstation:~# '].map((char) => filter.write(char)).join('')
    expect(out).toBe(`${aeMoveLine('workstation')}workstation:~# `)
  })

  it('says nothing more while the console stays in the same AE, and passes output as it came', () => {
    const filter = createAeMoveFilter('dicomfall')
    filter.write('workstation:~# ')
    expect(filter.write('ls /lab\r\n')).toBe('ls /lab\r\n')
    expect(filter.write('ct-explicit-le.dcm\r\nworkstation:~# ')).toBe('ct-explicit-le.dcm\r\nworkstation:~# ')
  })

  it('says each move from one AE into another', () => {
    const filter = createAeMoveFilter('dicomfall')
    filter.write('workstation:~# ')
    expect(filter.write('\r\narchive:~# ')).toBe(`\r\n${aeMoveLine('archive')}archive:~# `)
  })

  it('shows the Machine prompt when the player types at it, and when flushed', () => {
    const typed = createAeMoveFilter('dicomfall')
    typed.write('dicomfall:~# ')
    expect(typed.write('ls ')).toBe('dicomfall:~# ls ')
    const flushed = createAeMoveFilter('dicomfall')
    flushed.write('dicomfall:~# ')
    expect(flushed.flush()).toBe('dicomfall:~# ')
    expect(flushed.flush()).toBe('')
  })

  it('holds a line that may be a prompt only until it cannot be one', () => {
    const filter = createAeMoveFilter('dicomfall')
    expect(filter.write('total')).toBe('')
    expect(filter.write(' 10\r\n')).toBe('total 10\r\n')
    expect(filter.write('File: x\r\n')).toBe('File: x\r\n')
  })

  it('forgets what it held once the screen is cleared, but remembers the AE', () => {
    const filter = createAeMoveFilter('dicomfall')
    filter.write('workstation:~# ')
    filter.write('\r\nwork')
    filter.reset()
    expect(filter.write('workstation:~# ')).toBe('workstation:~# ')
  })
})
