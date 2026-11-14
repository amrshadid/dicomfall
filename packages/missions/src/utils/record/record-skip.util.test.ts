import type { LabDefinition } from '@dicomfall/game/types'
import { describe, expect, it } from 'vitest'
import { labSkipReason, needsGoDicom, skipReason } from '#utils/record/record-skip.util'

const WITHOUT = { goDicom: false }
const WITH = { goDicom: true }

describe('needsGoDicom', () => {
  it('finds go-dicom anywhere the shell would run it', () => {
    expect(needsGoDicom('go-dicom show /lab/ct.dcm')).toBe(true)
    expect(needsGoDicom('go-dicom')).toBe(true)
    expect(needsGoDicom('/usr/local/bin/go-dicom --version')).toBe(true)
    expect(needsGoDicom('ls /lab | go-dicom info')).toBe(true)
    expect(needsGoDicom('cd /lab && go-dicom show ct.dcm')).toBe(true)
    expect(needsGoDicom('(go-dicom show ct.dcm)')).toBe(true)
  })

  it('does not take a file or a word that only contains the name for it', () => {
    expect(needsGoDicom('hexdump -C /lab/ct.dcm | head -n 3')).toBe(false)
    expect(needsGoDicom('ls /lab/go-dicom-notes')).toBe(false)
    expect(needsGoDicom('echo not-go-dicom')).toBe(false)
  })
})

describe('skipReason', () => {
  it('skips a go-dicom command when the image has no go-dicom, with why', () => {
    expect(skipReason('go-dicom show /lab/ct.dcm', WITHOUT)).toBe(
      'it runs go-dicom, which is not in this image (/usr/local/bin/go-dicom)'
    )
  })

  it('records it when go-dicom is there, and records anything else either way', () => {
    expect(skipReason('go-dicom show /lab/ct.dcm', WITH)).toBeNull()
    expect(skipReason('hexdump -C /lab/ct.dcm | head -n 3', WITHOUT)).toBeNull()
  })
})

describe('labSkipReason', () => {
  const lab = (start: string[]): LabDefinition => ({
    aes: [
      { name: 'workstation', title: 'WORKSTATION', address: '10.0.1.1/24', start: [] },
      { name: 'archive', title: 'ARCHIVE', address: '10.0.1.2/24', start },
    ],
    links: [['workstation', 'archive']],
    files: [],
    console: 'workstation',
  })

  it('skips a mission whose lab starts go-dicom on an image without it', () => {
    expect(labSkipReason(lab(['go-dicom storescp -aet ARCHIVE -port 11112']), WITHOUT)).toMatch(
      /starts go-dicom in archive/
    )
    expect(labSkipReason(lab(['go-dicom storescp -aet ARCHIVE -port 11112']), WITH)).toBeNull()
    expect(labSkipReason(lab([]), WITHOUT)).toBeNull()
  })
})
