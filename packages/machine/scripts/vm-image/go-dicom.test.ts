import { describe, expect, it } from 'vitest'
import { goDicomFileName, goDicomPinProblems, goDicomUrl, isLinux386Elf } from '#vm-image/go-dicom'

const SHA = 'a'.repeat(64)

describe('the go-dicom pin', () => {
  it('takes a release’s linux-386 asset with the checksum from its SHA256SUMS', () => {
    expect(
      goDicomPinProblems({ version: '1.9.0', asset: 'go-dicom-linux-386', url: goDicomUrl('1.9.0'), sha256: SHA })
    ).toEqual([])
    expect(goDicomUrl('1.9.0')).toBe(
      'https://github.com/amrshadid/go-dicom/releases/download/v1.9.0/go-dicom-linux-386'
    )
    expect(goDicomFileName('1.9.0')).toBe('go-dicom-v1.9.0-linux-386')
  })

  it('refuses any other architecture, any other place, and a missing checksum', () => {
    const url = 'https://github.com/amrshadid/go-dicom/releases/download/v1.8.0/go-dicom-linux-amd64'
    expect(goDicomPinProblems({ version: 'v1.8.0', asset: 'go-dicom-linux-amd64', url, sha256: 'abc' })).toEqual([
      'goDicom.version: expected a release like 1.9.0, got "v1.8.0"',
      'goDicom.asset: expected go-dicom-linux-386 (v86 is 32-bit x86), got "go-dicom-linux-amd64"',
      `goDicom.url: expected https://github.com/amrshadid/go-dicom/releases/download/vv1.8.0/go-dicom-linux-386, got "${url}"`,
      'goDicom.sha256: expected the 64 hex digits of the asset’s line in SHA256SUMS',
    ])
    expect(goDicomPinProblems('1.9.0')).toHaveLength(1)
  })
})

describe('a 32-bit x86 Linux binary', () => {
  const header = (elfClass: number, machine: number) => {
    const bytes = new Uint8Array(64)
    bytes.set([0x7f, 0x45, 0x4c, 0x46, elfClass, 1, 1])
    bytes[18] = machine
    return bytes
  }

  it('is told apart from a 64-bit one, another machine, and no ELF at all', () => {
    expect(isLinux386Elf(header(1, 3))).toBe(true)
    expect(isLinux386Elf(header(2, 62))).toBe(false)
    expect(isLinux386Elf(header(1, 40))).toBe(false)
    expect(isLinux386Elf(new TextEncoder().encode('#!/bin/sh\n'))).toBe(false)
  })
})
