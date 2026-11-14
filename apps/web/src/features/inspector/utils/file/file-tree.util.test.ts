import type { TreeRow } from '@features/inspector/types'
import { describe, expect, it } from 'vitest'
import { CT_EXPLICIT_READING } from '@/test/fixtures/show-reading.fixture'
import { elementRowAt, partsOf, rowOfRange, tagText, treeRowsOf, valueText } from './file-tree.util'

const rows = treeRowsOf(CT_EXPLICIT_READING)
const row = (id: string): TreeRow => {
  const found = rows.find((candidate) => candidate.id === id)
  if (!found) {
    throw new Error(`no row ${id}`)
  }
  return found
}

describe('treeRowsOf', () => {
  it('lists the four regions in file order, each with the elements it holds', () => {
    expect(rows.filter((entry) => entry.kind === 'region').map((entry) => entry.id)).toEqual([
      'region:preamble',
      'region:prefix',
      'region:fileMeta',
      'region:dataSet',
    ])
    const fileMeta = rows.findIndex((entry) => entry.id === 'region:fileMeta')
    // (0002,0000) first, with its value: The Envelope reads 184 from it.
    expect(rows[fileMeta + 1]).toMatchObject({ kind: 'element', path: '(0002,0000)', range: { from: 132, to: 144 } })
    expect(valueText(row('(0002,0000)'))).toBe('184')
  })

  it("names a sequence's items and their elements by the checks' own paths", () => {
    expect(row('(0008,1032)[0]')).toMatchObject({ kind: 'item', depth: 1, range: { from: 766, to: 842 } })
    expect(row('(0008,1032)[0](0008,0100)')).toMatchObject({ kind: 'element', depth: 2 })
  })

  it('folds a sequence or an item that is closed', () => {
    const folded = treeRowsOf(CT_EXPLICIT_READING, new Set(['(0008,1032)']))
    expect(folded.some((entry) => entry.id.startsWith('(0008,1032)['))).toBe(false)
    expect(folded.find((entry) => entry.id === '(0008,1032)')).toMatchObject({ folds: true, open: false })
    const itemFolded = treeRowsOf(CT_EXPLICIT_READING, new Set(['(0008,1032)[0]']))
    expect(itemFolded.some((entry) => entry.id === '(0008,1032)[0]')).toBe(true)
    expect(itemFolded.some((entry) => entry.id === '(0008,1032)[0](0008,0100)')).toBe(false)
  })
})

describe('partsOf', () => {
  it("gives tag, VR, length and value apart, by the engine's ranges", () => {
    expect(partsOf(row('(0008,0060)'))).toEqual([
      { part: 'tag', range: { from: 628, to: 632 } },
      { part: 'vr', range: { from: 632, to: 634 } },
      { part: 'length', range: { from: 634, to: 636 } },
      { part: 'value', range: { from: 636, to: 638 } },
    ])
  })

  it("draws a long-form VR's two reserved bytes with the VR", () => {
    expect(partsOf(row('(0002,0001)')).find((entry) => entry.part === 'vr')?.range).toEqual({ from: 148, to: 152 })
  })

  it('gives an item no VR, and a region no parts', () => {
    expect(partsOf(row('(0008,1032)[0]')).map((entry) => entry.part)).toEqual(['tag', 'length', 'value'])
    expect(partsOf(row('region:preamble'))).toEqual([])
  })
})

describe('rowOfRange and elementRowAt', () => {
  it('finds the row whose bytes are exactly the range, region rows included', () => {
    expect(rowOfRange(rows, { from: 0, to: 128 })?.id).toBe('region:preamble')
    expect(rowOfRange(rows, { from: 628, to: 638 })?.id).toBe('(0008,0060)')
    expect(rowOfRange(rows, { from: 628, to: 637 })).toBeNull()
    expect(rowOfRange(rows, null)).toBeNull()
  })

  it('finds the innermost element holding a byte, and none in the preamble', () => {
    expect(elementRowAt(rows, 790)?.id).toBe('(0008,1032)[0](0008,0100)')
    expect(elementRowAt(rows, 636)?.id).toBe('(0008,0060)')
    expect(elementRowAt(rows, 5)).toBeNull()
  })
})

describe('tagText and valueText', () => {
  it('writes tags as go-dicom show prints them, and says what a row without a text value holds', () => {
    expect(tagText('(0008,0060)')).toBe('0008,0060')
    expect(valueText(row('(0008,1032)'))).toBe('1 item')
    expect(valueText(row('(0008,1032)[0]'))).toBe('3 elements')
    expect(valueText(row('(0002,0001)'))).toBe('<2 bytes>')
  })
})
