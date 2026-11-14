import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { CT_EXPLICIT_LE_SHOW_JSON, CT_IMPLICIT_LE_SHOW_JSON, SERIES_F01_SHOW_JSON } from '#test/show-json/index'
import type { ShowElement, ShowReading, ShowSpan } from '#types/definitions/show'
import { aeOfLabPath, parseShowJson, showJsonLine } from '#utils/files/show-json.util'

const fixtures = join(dirname(fileURLToPath(import.meta.url)), '../../../../fixtures/out')

/** Each capture with the fixture it was read from: the Machine's /lab copy of packages/fixtures/out. */
const CAPTURES = [
  { name: 'ct-explicit-le.dcm', json: CT_EXPLICIT_LE_SHOW_JSON },
  { name: 'ct-implicit-le.dcm', json: CT_IMPLICIT_LE_SHOW_JSON },
  { name: 'series/f01.dcm', json: SERIES_F01_SHOW_JSON },
] as const

function parsed(json: string): ShowReading {
  const reading = parseShowJson(json)
  if (!reading.ok) {
    throw new Error(reading.errors.join('\n'))
  }
  return reading.value
}

/** Every element and item, depth first, as they sit on disk. */
function* spans(elements: readonly ShowElement[]): Generator<ShowSpan> {
  for (const element of elements) {
    yield element
    for (const item of element.items ?? []) {
      yield item
      yield* spans(item.elements)
    }
  }
}

const tagBytes = (tag: string): number[] => {
  const [group = 0, element = 0] = /\(([0-9A-F]{4}),([0-9A-F]{4})\)/
    .exec(tag)
    ?.slice(1)
    .map((hex) => Number.parseInt(hex, 16)) ?? [0, 0]
  return [group & 0xff, group >> 8, element & 0xff, element >> 8]
}

const littleEndian = (bytes: Uint8Array, at: number, size: number): number =>
  size === 2
    ? (bytes[at] ?? 0) | ((bytes[at + 1] ?? 0) << 8)
    : ((bytes[at] ?? 0) | ((bytes[at + 1] ?? 0) << 8) | ((bytes[at + 2] ?? 0) << 16)) + (bytes[at + 3] ?? 0) * 2 ** 24

describe("go-dicom's show --json, read from real runs", () => {
  it('reads every capture with no problem', () => {
    for (const { json } of CAPTURES) {
      expect(parseShowJson(json).ok).toBe(true)
    }
  })

  it('gives the regions and the transfer syntax as go-dicom read them', () => {
    const explicit = parsed(CT_EXPLICIT_LE_SHOW_JSON)
    expect(explicit.regions).toEqual([
      { name: 'preamble', offset: 0, endOffset: 128 },
      { name: 'prefix', offset: 128, endOffset: 132 },
      { name: 'fileMeta', offset: 132, endOffset: 328 },
      { name: 'dataSet', offset: 328, endOffset: 9648 },
    ])
    expect(explicit.transferSyntax).toEqual({
      uid: '1.2.840.10008.1.2.1',
      explicitVR: true,
      littleEndian: true,
      deflated: false,
    })
    expect(parsed(CT_IMPLICIT_LE_SHOW_JSON).transferSyntax.explicitVR).toBe(false)
  })

  it('includes (0002,0000) first in the File Meta Information, where the text form leaves it out', () => {
    expect(parsed(CT_EXPLICIT_LE_SHOW_JSON).fileMeta[0]).toMatchObject({
      tag: '(0002,0000)',
      value: '184',
      tagOffset: 132,
      endOffset: 144,
    })
  })

  it('has no VR offset under implicit VR, except in group 0002, which is always explicit', () => {
    const implicit = parsed(CT_IMPLICIT_LE_SHOW_JSON)
    expect(implicit.fileMeta.every((element) => element.vrOffset !== null)).toBe(true)
    expect(implicit.dataSet.every((element) => element.vrOffset === null)).toBe(true)
  })

  it('nests the items of a sequence and the elements inside them', () => {
    const sequence = parsed(CT_EXPLICIT_LE_SHOW_JSON).dataSet.find((element) => element.tag === '(0008,1032)')
    expect(sequence).toMatchObject({ vr: 'SQ', tagOffset: 754, endOffset: 842 })
    expect(sequence?.value).toBeUndefined()
    expect(sequence?.items?.[0]).toMatchObject({ tag: '(FFFE,E000)', tagOffset: 766, endOffset: 842 })
    expect(sequence?.items?.[0]?.elements.map((element) => element.value)).toEqual([
      'DF-CT-PHANTOM',
      '99DFALL',
      'CT phantom, synthetic',
    ])
  })

  it('refuses another schema version with a clear error, never a half reading', () => {
    const next = CT_EXPLICIT_LE_SHOW_JSON.replace('"schemaVersion": 1', '"schemaVersion": 2')
    expect(parseShowJson(next)).toEqual({
      ok: false,
      errors: [expect.stringContaining('schemaVersion 2; this game reads schemaVersion 1 only')],
    })
    expect(parseShowJson('{}').ok).toBe(false)
  })

  it('refuses a reply that is not JSON, quoting its start', () => {
    expect(parseShowJson('show: open /lab/x.dcm: no such file')).toEqual({
      ok: false,
      errors: ["go-dicom's reply is not JSON: show: open /lab/x.dcm: no such file"],
    })
  })

  it('reports a field of the wrong type with its path', () => {
    const broken = CT_EXPLICIT_LE_SHOW_JSON.replace('"tagOffset": 132', '"tagOffset": "132"')
    const result = parseShowJson(broken)
    expect(result.ok).toBe(false)
    expect(result.ok ? [] : result.errors).toEqual(['fileMeta[0].tagOffset: expected a whole number, got text'])
  })
})

describe('the byte ranges go-dicom gives, against the fixture bytes', () => {
  for (const { name, json } of CAPTURES) {
    const bytes = new Uint8Array(readFileSync(join(fixtures, name)))
    const reading = parsed(json)

    it(`${name}: the regions tile the file, the preamble then DICM`, () => {
      expect(reading.size).toBe(bytes.length)
      expect(reading.regions.map((region) => [region.name, region.offset, region.endOffset]).slice(0, 2)).toEqual([
        ['preamble', 0, 128],
        ['prefix', 128, 132],
      ])
      expect(String.fromCharCode(...bytes.slice(128, 132))).toBe('DICM')
      reading.regions.forEach((region, at) => {
        expect(region.offset).toBe(at === 0 ? 0 : reading.regions[at - 1]?.endOffset)
      })
      expect(reading.regions.at(-1)?.endOffset).toBe(bytes.length)
      expect(reading.fileMeta[0]?.tagOffset).toBe(132)
      expect(reading.fileMeta.at(-1)?.endOffset).toBe(reading.regions[2]?.endOffset)
      expect(reading.dataSet.at(-1)?.endOffset).toBe(bytes.length)
    })

    it(`${name}: each element's tag, VR, length and value sit where go-dicom says`, () => {
      for (const span of spans([...reading.fileMeta, ...reading.dataSet])) {
        const where = `${span.tag} at ${span.tagOffset}`
        expect([...bytes.slice(span.tagOffset, span.tagOffset + 4)], where).toEqual(tagBytes(span.tag))
        const element = 'vr' in span ? (span as ShowElement) : null
        if (element !== null && element.vrOffset !== null) {
          const vr = String.fromCharCode(...bytes.slice(element.vrOffset, element.vrOffset + 2))
          expect(vr, where).toBe(element.vr)
          expect(element.vrOffset, where).toBe(span.tagOffset + 4)
        } else {
          expect(span.lengthOffset, where).toBe(span.tagOffset + 4)
        }
        expect(span.valueOffset, where).toBe(span.lengthOffset + span.lengthSize)
        if (!span.undefinedLength) {
          expect(littleEndian(bytes, span.lengthOffset, span.lengthSize), where).toBe(span.valueLength)
          expect(span.endOffset, where).toBe(span.valueOffset + span.valueLength)
        }
      }
    })

    it(`${name}: consecutive elements leave no gap, and the items fill their sequence`, () => {
      const contiguous = (elements: readonly ShowElement[], from: number, to: number) => {
        let at = from
        for (const element of elements) {
          expect(element.tagOffset, element.tag).toBe(at)
          at = element.endOffset
          let inside = element.valueOffset
          for (const item of element.items ?? []) {
            expect(item.tagOffset, `${element.tag} item`).toBe(inside)
            contiguous(item.elements, item.valueOffset, item.endOffset)
            inside = item.endOffset
          }
        }
        expect(at).toBe(to)
      }
      contiguous(reading.fileMeta, 132, reading.regions[2]?.endOffset ?? 0)
      contiguous(reading.dataSet, reading.regions[3]?.offset ?? 0, bytes.length)
    })
  }
})

describe("root's line for a reading", () => {
  it('quotes the path and asks for JSON', () => {
    expect(showJsonLine("/lab/it's.dcm")).toBe(`/usr/local/bin/go-dicom show '/lab/it'\\''s.dcm' --json`)
  })

  it('names the AE of a receive folder, and none for the shared lab', () => {
    expect(aeOfLabPath('/lab/archive/received/1.2.3.dcm')).toBe('archive')
    expect(aeOfLabPath('/lab/ct-explicit-le.dcm')).toBeNull()
    expect(aeOfLabPath('/lab/series/f01.dcm')).toBeNull()
  })
})
