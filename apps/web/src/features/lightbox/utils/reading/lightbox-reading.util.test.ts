import { describe, expect, it } from 'vitest'
import { CT_EXPLICIT_READING } from '@/test/fixtures/show-reading.fixture'
import { fingerprintOf, hasPixelData, pixelFactsOf, renderLine, uidTrailOf } from './lightbox-reading.util'

describe('pixelFactsOf and uidTrailOf', () => {
  it("reads the pixel elements and the UIDs from go-dicom's reading", () => {
    expect(pixelFactsOf(CT_EXPLICIT_READING).map((fact) => [fact.label, fact.value])).toEqual([
      ['Rows', '64'],
      ['Columns', '64'],
      ['Bits Allocated', '16'],
      ['Photometric Interpretation', 'MONOCHROME2'],
    ])
    expect(uidTrailOf(CT_EXPLICIT_READING).map((fact) => fact.value)).toEqual([
      '2.25.244689099060892268776675746833514200113',
      '2.25.262811267488977860285166554097588707013',
      '2.25.251886266211036739612775034372164643306',
    ])
  })

  it('says null for an element the file lacks', () => {
    const bare = { ...CT_EXPLICIT_READING, dataSet: [] }
    expect(pixelFactsOf(bare).every((fact) => fact.value === null)).toBe(true)
    expect(hasPixelData(bare)).toBe(false)
    expect(hasPixelData(CT_EXPLICIT_READING)).toBe(true)
  })
})

describe('renderLine', () => {
  it("renders with go-dicom's own convert into /tmp, the path quoted", () => {
    expect(renderLine("/lab/it's.dcm")).toBe(
      "rm -f /tmp/df-preview.png && /usr/local/bin/go-dicom convert '/lab/it'\\''s.dcm' /tmp/df-preview.png --format png"
    )
  })
})

describe('fingerprintOf', () => {
  it('changes with the bytes, not with the read', () => {
    expect(fingerprintOf(new Uint8Array([1, 2, 3]))).toBe(fingerprintOf(new Uint8Array([1, 2, 3])))
    expect(fingerprintOf(new Uint8Array([1, 2, 3]))).not.toBe(fingerprintOf(new Uint8Array([1, 2, 4])))
  })
})
