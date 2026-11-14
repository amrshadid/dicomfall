import { describe, expect, it } from 'vitest'
import { CT_EXPLICIT_LE_READING, CT_IMPLICIT_LE_READING, SERIES_F01_READING } from '#test/readings'
import {
  type FileReading,
  type LabReadings,
  NO_PLAYER_ACTIONS,
  type PlayerActions,
  type ReadingElement,
} from '#types/definitions/checks'
import {
  checkAbsent,
  checkAnswer,
  checkFile,
  checkGrouped,
  checkOffset,
  checkSelected,
} from '#utils/checks/file-checks.util'

const EXPLICIT = '/lab/ct-explicit-le.dcm'
const IMPLICIT = '/lab/ct-implicit-le.dcm'
const READINGS: LabReadings = {
  files: {
    [EXPLICIT]: { ok: true, reading: CT_EXPLICIT_LE_READING },
    [IMPLICIT]: { ok: true, reading: CT_IMPLICIT_LE_READING },
    '/lab/notes.txt': { ok: false, error: 'not a DICOM file' },
  },
  folders: {},
  start: {},
}

const marking = (file: string, from: number, to: number): PlayerActions => ({
  ...NO_PLAYER_ACTIONS,
  selection: { file, from, to },
})
const answering = (objective: string, value: string): PlayerActions => ({
  ...NO_PLAYER_ACTIONS,
  answers: { [objective]: value },
})
const predicting = (objective: string, offset: number): PlayerActions => ({
  ...NO_PLAYER_ACTIONS,
  predictions: { [objective]: offset },
})

describe('selected', () => {
  const name = { kind: 'selected', file: EXPLICIT, element: '(0010,0010)' } as const

  it("passes on exactly go-dicom's bytes, with them as evidence", () => {
    expect(checkSelected(name, marking(EXPLICIT, 878, 898), READINGS)).toEqual({
      kind: 'selected',
      passed: true,
      failure: null,
      file: EXPLICIT,
      target: '(0010,0010)',
      part: null,
      expected: { from: 878, to: 898 },
      marked: { file: EXPLICIT, from: 878, to: 898 },
    })
  })

  it('fails on a byte short, the value alone, another file, or nothing marked', () => {
    expect(checkSelected(name, marking(EXPLICIT, 878, 897), READINGS).failure).toBe('wrong_range')
    expect(checkSelected(name, marking(EXPLICIT, 886, 898), READINGS).failure).toBe('wrong_range')
    expect(checkSelected(name, marking(IMPLICIT, 878, 898), READINGS).failure).toBe('wrong_file')
    expect(checkSelected(name, NO_PLAYER_ACTIONS, READINGS)).toMatchObject({
      failure: 'not_marked',
      expected: { from: 878, to: 898 },
    })
  })

  it('narrows to a part, and marks a region', () => {
    const vr = { kind: 'selected', file: IMPLICIT, element: '(0002,0010)', part: 'vr' } as const
    expect(checkSelected(vr, marking(IMPLICIT, 248, 250), READINGS).passed).toBe(true)
    const meta = { kind: 'selected', file: IMPLICIT, region: 'file-meta-information' } as const
    expect(checkSelected(meta, marking(IMPLICIT, 132, 326), READINGS).passed).toBe(true)
    expect(checkSelected(meta, marking(IMPLICIT, 132, 328), READINGS).failure).toBe('wrong_range')
  })

  it('says why it cannot pass: no such part, no such element, the file unread or refused', () => {
    const implicitVr = { kind: 'selected', file: IMPLICIT, element: '(0010,0010)', part: 'vr' } as const
    expect(checkSelected(implicitVr, marking(IMPLICIT, 876, 878), READINGS).failure).toBe('no_part')
    const missing = { kind: 'selected', file: EXPLICIT, element: '(0010,1010)' } as const
    expect(checkSelected(missing, marking(EXPLICIT, 0, 4), READINGS).failure).toBe('no_element')
    expect(checkSelected({ ...name, file: '/lab/x.dcm' }, NO_PLAYER_ACTIONS, READINGS).failure).toBe('not_read')
    expect(checkSelected({ ...name, file: '/lab/notes.txt' }, NO_PLAYER_ACTIONS, READINGS).failure).toBe('unreadable')
  })

  it("leaves the Wire inspector's form unevaluated", () => {
    const wire = { kind: 'selected', message: 'C-STORE-RQ', set: 'command', element: '(0000,1000)' } as const
    expect(checkSelected(wire, NO_PLAYER_ACTIONS, READINGS)).toMatchObject({ passed: false, failure: 'not_evaluated' })
  })
})

describe('answer', () => {
  const modality = { kind: 'answer', file: EXPLICIT, element: '(0008,0060)' } as const

  it("passes on go-dicom's value, case-blind for a code string, with both values as evidence", () => {
    expect(checkAnswer(modality, 'm', answering('m', 'ct'), READINGS)).toEqual({
      kind: 'answer',
      passed: true,
      failure: null,
      file: EXPLICIT,
      element: '(0008,0060)',
      vr: 'CS',
      expected: 'CT',
      given: 'ct',
    })
  })

  it('reads an element inside a sequence', () => {
    const code = { kind: 'answer', file: IMPLICIT, element: '(0008,1032)[0](0008,0104)' } as const
    expect(checkAnswer(code, 'c', answering('c', 'CT phantom, synthetic'), READINGS).passed).toBe(true)
  })

  it('fails on a wrong or partial value, an empty box, and an element with no text value', () => {
    expect(checkAnswer(modality, 'm', answering('m', 'MR'), READINGS).failure).toBe('wrong_value')
    const imageType = { kind: 'answer', file: EXPLICIT, element: '(0008,0008)' } as const
    expect(checkAnswer(imageType, 'i', answering('i', 'ORIGINAL'), READINGS).failure).toBe('wrong_value')
    expect(checkAnswer(modality, 'm', answering('m', ' '), READINGS).failure).toBe('not_given')
    expect(checkAnswer(modality, 'm', NO_PLAYER_ACTIONS, READINGS).failure).toBe('not_given')
    const sequence = { kind: 'answer', file: EXPLICIT, element: '(0008,1032)' } as const
    expect(checkAnswer(sequence, 's', answering('s', 'x'), READINGS).failure).toBe('no_value')
  })
})

describe('offset', () => {
  const id = { kind: 'offset', file: EXPLICIT, element: '(0010,0020)', offset: 898 } as const

  it("passes on go-dicom's start of the element, and keeps the spec's offset beside it", () => {
    expect(checkOffset(id, 'o', predicting('o', 898), READINGS)).toEqual({
      kind: 'offset',
      passed: true,
      failure: null,
      file: EXPLICIT,
      element: '(0010,0020)',
      expected: 898,
      declared: 898,
      given: 898,
    })
    expect(checkOffset(id, 'o', predicting('o', 878), READINGS).failure).toBe('wrong_offset')
    expect(checkOffset(id, 'o', NO_PLAYER_ACTIONS, READINGS).failure).toBe('not_given')
  })

  it('judges against go-dicom, not the spec, when the two disagree', () => {
    const wrongSpec = { ...id, offset: 900 }
    expect(checkOffset(wrongSpec, 'o', predicting('o', 898), READINGS)).toMatchObject({
      passed: true,
      expected: 898,
      declared: 900,
    })
  })

  it('takes an item’s start too', () => {
    const item = { kind: 'offset', file: EXPLICIT, element: '(0008,1032)[0]', offset: 766 } as const
    expect(checkOffset(item, 'o', predicting('o', 766), READINGS).passed).toBe(true)
  })
})

/** A reading holding only the three UIDs a `grouped` check reads; the UIDs are packages/fixtures/out/manifest.json's. */
function uidsReading(sop: string, study: string, series: string): FileReading {
  const element = (tag: string, value: string): ReadingElement => ({
    ...(SERIES_F01_READING.dataSet[0] as ReadingElement),
    tag,
    value,
  })
  return {
    ...SERIES_F01_READING,
    dataSet: [element('(0008,0018)', sop), element('(0020,000D)', study), element('(0020,000E)', series)],
  }
}

describe('grouped', () => {
  const STUDY_A = '2.25.87115403254764791248648702806613763540'
  const STUDY_B = '2.25.244689099060892268776675746833514200113'
  const F01 = { ok: true, reading: SERIES_F01_READING } as const
  const F02 = {
    ok: true,
    reading: uidsReading(
      '2.25.317118094456324451845838311032322903914',
      STUDY_B,
      '2.25.262811267488977860285166554097588707013'
    ),
  } as const
  const F03 = {
    ok: true,
    reading: uidsReading(
      '2.25.142857737833631724124164844337364812269',
      STUDY_B,
      '2.25.294765142776525871675099788420847192460'
    ),
  } as const
  const check = {
    kind: 'grouped',
    files: ['/lab/series/f01.dcm', '/lab/series/f02.dcm', '/lab/series/f03.dcm'],
    into: '/lab/sorted',
    by: 'study',
  } as const
  const start = { '/lab/series/f01.dcm': F01, '/lab/series/f02.dcm': F02, '/lab/series/f03.dcm': F03 }

  /** The lab with each file now at the path given, under /lab/sorted. */
  const sortedAs = (paths: readonly [string, string, string]): LabReadings => ({
    files: Object.fromEntries(paths.map((path, at) => [`/lab/sorted/${path}`, [F01, F02, F03][at] ?? F01])),
    folders: { '/lab/sorted': paths.map((path) => `/lab/sorted/${path}`) },
    start,
  })

  it('passes when each study has a folder of its own, whatever its name', () => {
    const result = checkGrouped(check, sortedAs(['first/f01.dcm', 'second/f02.dcm', 'second/renamed.dcm']))
    expect(result).toMatchObject({ passed: true, failure: null, missing: [] })
    expect(result.found.map((file) => [file.relative, file.studyInstanceUid])).toEqual([
      ['first/f01.dcm', STUDY_A],
      ['second/f02.dcm', STUDY_B],
      ['second/renamed.dcm', STUDY_B],
    ])
  })

  it('fails on a folder with two studies, a study in two folders, a missing file or the wrong depth', () => {
    expect(checkGrouped(check, sortedAs(['a/f01.dcm', 'a/f02.dcm', 'b/f03.dcm'])).failure).toBe('mixed_folder')
    expect(checkGrouped(check, sortedAs(['a/f01.dcm', 'b/f02.dcm', 'c/f03.dcm'])).failure).toBe('split_group')
    expect(checkGrouped(check, sortedAs(['f01.dcm', 'b/f02.dcm', 'b/f03.dcm'])).failure).toBe('wrong_depth')
    const two = sortedAs(['a/f01.dcm', 'b/f02.dcm', 'b/f03.dcm'])
    const missing = checkGrouped(check, { ...two, folders: { '/lab/sorted': ['/lab/sorted/a/f01.dcm'] } })
    expect(missing).toMatchObject({ failure: 'missing_files', missing: [expect.any(String), expect.any(String)] })
    expect(checkGrouped(check, { ...two, folders: {} }).failure).toBe('not_read')
  })

  it('by series: a study folder, then a folder per series', () => {
    const bySeries = { ...check, by: 'series' } as const
    expect(checkGrouped(bySeries, sortedAs(['a/x/f01.dcm', 'b/y/f02.dcm', 'b/z/f03.dcm'])).passed).toBe(true)
    expect(checkGrouped(bySeries, sortedAs(['a/x/f01.dcm', 'b/y/f02.dcm', 'b/y/f03.dcm'])).failure).toBe('mixed_folder')
    expect(checkGrouped(bySeries, sortedAs(['a/x/f01.dcm', 'b/f02.dcm', 'b/z/f03.dcm'])).failure).toBe('wrong_depth')
  })
})

describe('file', () => {
  it('passes on the transfer syntax and the attributes, a sameAs read from the other file', () => {
    const check = {
      kind: 'file',
      file: IMPLICIT,
      transferSyntax: '1.2.840.10008.1.2',
      attributes: {
        '(0010,0010)': 'FALLS^DICOM',
        '(0010,0020)': { sameAs: { file: EXPLICIT, element: '(0010,0020)' } },
      },
    } as const
    expect(checkFile(check, READINGS)).toEqual({
      kind: 'file',
      passed: true,
      failure: null,
      file: IMPLICIT,
      transferSyntax: '1.2.840.10008.1.2',
      attributes: [
        { tag: '(0010,0010)', expected: 'FALLS^DICOM', found: 'FALLS^DICOM', passed: true },
        { tag: '(0010,0020)', expected: 'DF-0001', found: 'DF-0001', passed: true },
      ],
    })
  })

  it('fails on another transfer syntax, a different value, or a sameAs file not read', () => {
    expect(checkFile({ kind: 'file', file: IMPLICIT, transferSyntax: '1.2.840.10008.1.2.1' }, READINGS).failure).toBe(
      'wrong_transfer_syntax'
    )
    expect(checkFile({ kind: 'file', file: IMPLICIT, attributes: { '(0010,0010)': 'X' } }, READINGS).failure).toBe(
      'wrong_attribute'
    )
    const unread = { sameAs: { file: '/lab/y.dcm', element: '(0010,0020)' } }
    expect(checkFile({ kind: 'file', file: IMPLICIT, attributes: { '(0010,0020)': unread } }, READINGS)).toMatchObject({
      failure: 'wrong_attribute',
      attributes: [{ expected: null, found: 'DF-0001', passed: false }],
    })
  })
})

describe('absent', () => {
  it('passes only on a file that decodes and lacks the element', () => {
    const name = { kind: 'absent', file: EXPLICIT, element: '(0010,0010)' } as const
    expect(checkAbsent(name, READINGS)).toMatchObject({ passed: false, failure: 'still_present', present: true })
    expect(checkAbsent({ ...name, element: '(0010,1010)' }, READINGS)).toMatchObject({ passed: true, present: false })
    expect(checkAbsent({ ...name, file: '/lab/notes.txt' }, READINGS)).toMatchObject({
      failure: 'unreadable',
      present: null,
    })
  })
})
