import { describe, expect, it } from 'vitest'
import { sameValue, valuesOf } from '#utils/checks/answer-value.util'

describe('an answer against go-dicom’s value', () => {
  it('trims spaces and the NUL padding, value by value', () => {
    expect(valuesOf(' 1.2.840.10008.1.2.1\0')).toEqual(['1.2.840.10008.1.2.1'])
    expect(sameValue('1.2.840.10008.1.2.1\0', '1.2.840.10008.1.2.1', 'UI')).toBe(true)
    expect(sameValue(' FALLS^DICOM ', 'FALLS^DICOM', 'PN')).toBe(true)
  })

  it('is case-blind for a code string only', () => {
    expect(sameValue('ct', 'CT', 'CS')).toBe(true)
    expect(sameValue('falls^dicom', 'FALLS^DICOM', 'PN')).toBe(false)
  })

  it('compares numbers as numbers', () => {
    expect(sameValue('00', '0', 'US')).toBe(true)
    expect(sameValue('5.0\\5', '5\\5', 'DS')).toBe(true)
    expect(sameValue('1.2.840.10008.1.2', '1.2.840.10008.1.2.0', 'UI')).toBe(false)
    expect(sameValue('five', '5', 'DS')).toBe(false)
  })

  it('wants every value, in order', () => {
    expect(sameValue('ORIGINAL\\PRIMARY\\AXIAL', 'ORIGINAL\\PRIMARY\\AXIAL', 'CS')).toBe(true)
    expect(sameValue('original \\ primary \\ axial', 'ORIGINAL\\PRIMARY\\AXIAL', 'CS')).toBe(true)
    expect(sameValue('ORIGINAL', 'ORIGINAL\\PRIMARY\\AXIAL', 'CS')).toBe(false)
    expect(sameValue('PRIMARY\\ORIGINAL\\AXIAL', 'ORIGINAL\\PRIMARY\\AXIAL', 'CS')).toBe(false)
    expect(sameValue('5', '5\\5', 'DS')).toBe(false)
  })

  it('never takes an empty answer', () => {
    expect(sameValue('', '', 'PN')).toBe(false)
    expect(sameValue('  ', '', 'LO')).toBe(false)
  })
})
