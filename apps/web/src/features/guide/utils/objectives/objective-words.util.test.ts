import type { CheckResult } from '@dicomfall/game/types'
import { describe, expect, it } from 'vitest'
import { bytesWords, objectiveWordsOf } from './objective-words.util'

const FILE = '/lab/ct.dcm'

const selected = (
  marked: { from: number; to: number; file?: string } | null,
  failure: 'wrong_range' | 'wrong_file' | 'not_marked' | null,
  target = 'preamble'
): CheckResult => ({
  kind: 'selected',
  passed: failure === null,
  failure,
  file: FILE,
  target,
  part: null,
  expected: { from: 0, to: 128 },
  marked: marked === null ? null : { file: marked.file ?? FILE, from: marked.from, to: marked.to },
})

describe('bytesWords', () => {
  it('counts both ends, as the story says "0 to 127"', () => {
    expect(bytesWords(0, 128)).toBe('bytes 0 to 127 (128 bytes)')
    expect(bytesWords(5, 6)).toBe('bytes 5 to 5 (1 byte)')
  })
})

describe('objectiveWordsOf', () => {
  it('says nothing before a judging, or while nothing is marked or given', () => {
    expect(objectiveWordsOf(null)).toEqual({ state: 'open', evidence: null, observed: null })
    expect(objectiveWordsOf(selected(null, 'not_marked'))).toEqual({ state: 'open', evidence: null, observed: null })
  })

  it('names what met a selection', () => {
    expect(objectiveWordsOf(selected({ from: 0, to: 128 }, null)).evidence).toBe(
      'you marked bytes 0 to 127 (128 bytes), the preamble.'
    )
  })

  it('calls a range that covers part of the bytes "partly", without giving the offsets asked for', () => {
    const inside = objectiveWordsOf(selected({ from: 0, to: 100 }, 'wrong_range'))
    expect(inside.state).toBe('partly')
    expect(inside.observed).toBe('you marked bytes 0 to 99 (100 bytes): part of the preamble, not all of it.')
    expect(objectiveWordsOf(selected({ from: 0, to: 132 }, 'wrong_range')).observed).toContain('and more besides')
    const elsewhere = objectiveWordsOf(selected({ from: 200, to: 210 }, 'wrong_range'))
    expect(elsewhere.state).toBe('open')
    expect(elsewhere.observed).toContain('which is not the preamble')
  })

  it('says when the marked bytes are in another file', () => {
    expect(objectiveWordsOf(selected({ from: 0, to: 128, file: '/lab/b.dcm' }, 'wrong_file')).observed).toBe(
      'the marked bytes are in `/lab/b.dcm`; this one asks about `/lab/ct.dcm`.'
    )
  })

  it('says a wrong answer plainly and asks again, never giving the value', () => {
    const words = objectiveWordsOf({
      kind: 'answer',
      passed: false,
      failure: 'wrong_value',
      file: FILE,
      element: '(0008,0060)',
      vr: 'CS',
      expected: 'CT',
      given: 'MR',
    })
    expect(words.observed).toBe('`MR` is not what the file holds there. Try again: retries are free.')
    expect(words.observed).not.toContain('CT')
  })

  it('says a wrong offset plainly, and what a met one is', () => {
    const base = { kind: 'offset', file: FILE, element: '(0008,0005)', declared: 328 } as const
    expect(
      objectiveWordsOf({ ...base, passed: false, failure: 'wrong_offset', expected: 328, given: 316 }).observed
    ).toBe('it does not start at byte 316. Try again: retries are free.')
    expect(objectiveWordsOf({ ...base, passed: true, failure: null, expected: 328, given: 328 }).evidence).toBe(
      '`(0008,0005)` starts at byte 328.'
    )
  })

  it('leaves a wire check to the stage that opens the wire', () => {
    expect(objectiveWordsOf({ kind: 'echo', passed: false, failure: 'not_evaluated' }).observed).toBe(
      'this is judged on the wire, which a later stage opens.'
    )
  })
})
