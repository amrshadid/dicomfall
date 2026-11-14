import type { LabDefinition } from '@dicomfall/game/types'
import { describe, expect, it } from 'vitest'
import { labNetwork, startLine, startPort } from '#utils/record/record-lab.util'

describe('labNetwork', () => {
  it('gives the Machine the AEs, links and files, without what it has no field for', () => {
    const lab: LabDefinition = {
      aes: [
        { name: 'workstation', title: 'WORKSTATION', start: [] },
        { name: 'archive', title: 'ARCHIVE', address: '10.0.1.2/24', start: ['go-dicom storescp -port 11112'] },
      ],
      links: [],
      files: [{ fixture: 'ct-explicit-le.dcm', to: '/lab/ct.dcm' }],
      console: 'workstation',
    }
    expect(labNetwork(lab)).toEqual({
      aes: [
        { name: 'workstation', title: 'WORKSTATION' },
        { name: 'archive', title: 'ARCHIVE', address: '10.0.1.2/24' },
      ],
      links: [],
      files: [{ fixture: 'ct-explicit-le.dcm', to: '/lab/ct.dcm' }],
    })
  })
})

describe('startLine', () => {
  it('starts the command in the AE, in the background, into its log', () => {
    expect(startLine('archive', 'go-dicom storescp -port 11112')).toBe(
      "(ip netns exec archive unshare -u sh -c 'hostname archive && exec go-dicom storescp -port 11112') >> /var/log/df-start-archive.log 2>&1 < /dev/null &"
    )
  })

  it('refuses a command a single-quoted word cannot hold', () => {
    expect(startLine('archive', "go-dicom storescp -aet 'A B'")).toBeNull()
  })
})

describe('startPort', () => {
  it('reads the port it listens on', () => {
    expect(startPort('go-dicom storescp -aet ARCHIVE -port 11112 -output /lab/archive/received')).toBe(11112)
    expect(startPort('go-dicom qrscp --port=104')).toBe(104)
    expect(startPort('go-dicom storescp -aet ARCHIVE')).toBeNull()
  })
})
