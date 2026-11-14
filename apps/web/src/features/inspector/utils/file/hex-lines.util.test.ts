import { describe, expect, it } from 'vitest'
import { CT_EXPLICIT_READING } from '@/test/fixtures/show-reading.fixture'
import { byteHex, byteText, hexLinesOf, hexOffset, inRange, lineIndexOf, spanOf } from './hex-lines.util'

describe('hexLinesOf', () => {
  const lines = hexLinesOf(CT_EXPLICIT_READING.size, CT_EXPLICIT_READING.regions)

  it('lays bytes out sixteen to a line, with each region band before the line it starts in', () => {
    expect(lines.slice(0, 3)).toEqual([
      { kind: 'band', region: CT_EXPLICIT_READING.regions[0] },
      { kind: 'bytes', start: 0 },
      { kind: 'bytes', start: 16 },
    ])
    // The prefix at 128 and the File Meta Information at 132 both start in the line at 128.
    const at128 = lines.findIndex((line) => line.kind === 'bytes' && line.start === 128)
    expect(lines.slice(at128 - 2, at128).map((line) => (line.kind === 'band' ? line.region.name : null))).toEqual([
      'prefix',
      'fileMeta',
    ])
    expect(lines.filter((line) => line.kind === 'bytes')).toHaveLength(603)
  })

  it('finds the line that holds a byte', () => {
    const at = lineIndexOf(lines, 130)
    expect(lines[at]).toEqual({ kind: 'bytes', start: 128 })
  })
})

describe('byte text', () => {
  it('prints as hexdump -C does', () => {
    expect(hexOffset(128)).toBe('00000080')
    expect(byteHex(0x4d)).toBe('4d')
    expect(byteText(0x44)).toBe('D')
    expect(byteText(0)).toBe('.')
  })

  it('spans two bytes either way, both included', () => {
    expect(spanOf(127, 0)).toEqual({ from: 0, to: 128 })
    expect(inRange({ from: 0, to: 128 }, 127)).toBe(true)
    expect(inRange({ from: 0, to: 128 }, 128)).toBe(false)
    expect(inRange(null, 0)).toBe(false)
  })
})
