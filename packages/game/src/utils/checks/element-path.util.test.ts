import { describe, expect, it } from 'vitest'
import { CT_EXPLICIT_LE_READING, CT_IMPLICIT_LE_READING } from '#test/readings'
import { findTarget, parseElementPath, rangeOf, regionRange, startOf } from '#utils/checks/element-path.util'

const target = (path: string, reading = CT_EXPLICIT_LE_READING) => {
  const found = findTarget(reading, path)
  if (found === null) {
    throw new Error(`no ${path}`)
  }
  return found
}

describe('element paths', () => {
  it('reads a tag, an item and an element inside it', () => {
    expect(parseElementPath('(0008,1032)[0](0008,0100)')).toEqual([
      { tag: '(0008,1032)' },
      { item: 0 },
      { tag: '(0008,0100)' },
    ])
    expect(parseElementPath('(7fe0,0010)')).toEqual([{ tag: '(7FE0,0010)' }])
  })

  it('refuses what is not a path', () => {
    for (const path of ['', '[0]', '(0008,1032)[0][1]', '(0008,1032)(0008,0100)', '0008,0060', '(0008,0060) ']) {
      expect(parseElementPath(path), path).toBeNull()
    }
  })

  it('finds top-level elements in either group, and elements inside a sequence through its items', () => {
    expect(startOf(target('(0002,0010)'))).toBe(244)
    expect(startOf(target('(0010,0020)'))).toBe(898)
    expect(startOf(target('(0008,1032)[0]'))).toBe(766)
    expect(startOf(target('(0008,1032)[0](0008,0104)', CT_IMPLICIT_LE_READING))).toBe(806)
    expect(findTarget(CT_EXPLICIT_LE_READING, '(0008,1032)[1]')).toBeNull()
    expect(findTarget(CT_EXPLICIT_LE_READING, '(0008,0100)')).toBeNull()
    expect(findTarget(CT_EXPLICIT_LE_READING, '(0010,0010)[0]')).toBeNull()
  })
})

describe('the bytes of an element, a part, an item or a region', () => {
  it('gives the whole element and each part as the inspector draws them', () => {
    const modality = target('(0008,0060)')
    expect(rangeOf(modality)).toEqual({ from: 628, to: 638 })
    expect(rangeOf(modality, 'tag')).toEqual({ from: 628, to: 632 })
    expect(rangeOf(modality, 'vr')).toEqual({ from: 632, to: 634 })
    expect(rangeOf(modality, 'length')).toEqual({ from: 634, to: 636 })
    expect(rangeOf(modality, 'value')).toEqual({ from: 636, to: 638 })
  })

  it("covers a long-form VR's two reserved bytes, and a 4-byte length after them", () => {
    const pixels = target('(7FE0,0010)')
    expect(rangeOf(pixels, 'vr')).toEqual({ from: 1448, to: 1452 })
    expect(rangeOf(pixels, 'length')).toEqual({ from: 1452, to: 1456 })
  })

  it('has no VR under implicit VR, and none on an item', () => {
    expect(rangeOf(target('(0010,0010)', CT_IMPLICIT_LE_READING), 'vr')).toBeNull()
    expect(rangeOf(target('(0010,0010)', CT_IMPLICIT_LE_READING), 'length')).toEqual({ from: 876, to: 880 })
    expect(rangeOf(target('(0002,0010)', CT_IMPLICIT_LE_READING), 'vr')).toEqual({ from: 248, to: 250 })
    expect(rangeOf(target('(0008,1032)[0]'), 'vr')).toBeNull()
    expect(rangeOf(target('(0008,1032)[0]'))).toEqual({ from: 766, to: 842 })
  })

  it('stops an undefined-length value before its 8-byte delimiter', () => {
    const sequence = target('(0008,1032)')
    if (sequence.kind !== 'element') {
      throw new Error('expected an element')
    }
    const undefinedLength = {
      kind: 'element' as const,
      element: { ...sequence.element, undefinedLength: true, valueLength: 0xffffffff, endOffset: 850 },
    }
    expect(rangeOf(undefinedLength, 'value')).toEqual({ from: 766, to: 842 })
  })

  it("maps the four regions to go-dicom's", () => {
    expect(regionRange(CT_EXPLICIT_LE_READING, 'preamble')).toEqual({ from: 0, to: 128 })
    expect(regionRange(CT_EXPLICIT_LE_READING, 'prefix')).toEqual({ from: 128, to: 132 })
    expect(regionRange(CT_EXPLICIT_LE_READING, 'file-meta-information')).toEqual({ from: 132, to: 328 })
    expect(regionRange(CT_EXPLICIT_LE_READING, 'data-set')).toEqual({ from: 328, to: 9648 })
    expect(regionRange({ ...CT_EXPLICIT_LE_READING, regions: [] }, 'preamble')).toBeNull()
  })
})
