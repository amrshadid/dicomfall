import { describe, expect, it } from 'vitest'
import { firstDifference, normaliseRecording } from '#utils/record/record-check.util'

describe('normaliseRecording', () => {
  it('marks every reading of the clock', () => {
    expect(normaliseRecording('-rw-r--r--    1 root     root          9634 Nov 14 16:21 ct.dcm')).toBe(
      '-rw-r--r--    1 root     root          9634 <date> ct.dcm'
    )
    expect(normaliseRecording('Jan  3  2025 old')).toBe('<date> old')
    expect(normaliseRecording('at 2026-11-14T16:21:44.123Z and 2026-11-14 16:21:44+02:00')).toBe('at <time> and <time>')
    expect(normaliseRecording('16:21:44.5 received')).toBe('<time> received')
  })

  it('leaves DICOM values and offsets as they are', () => {
    const shown = '(0008,0020) DA StudyDate 20240115\n00000080  44 49 43 4d 02 00 00 00  55 4c 04 00'
    expect(normaliseRecording(shown)).toBe(shown)
  })
})

describe('firstDifference', () => {
  it('agrees past the clock', () => {
    expect(firstDifference('a\n9634 Nov 14 16:21 ct.dcm', 'a\n9634 Nov 15 09:02 ct.dcm')).toBeNull()
  })

  it('names the first line that differs, as each side has it', () => {
    expect(firstDifference('a\nb\nc', 'a\nB\nc')).toEqual({ line: 2, body: 'b', fresh: 'B' })
    expect(firstDifference('a', 'a\nb')).toEqual({ line: 2, body: '(no line)', fresh: 'b' })
  })
})
