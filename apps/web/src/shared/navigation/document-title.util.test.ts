import { describe, expect, it } from 'vitest'
import { documentTitleOf, screenTitleOf } from './document-title.util'

describe('documentTitleOf', () => {
  it.each([
    [{ name: 'title' } as const, 'DICOMFall: Learn DICOM from the first byte to the network.'],
    [{ name: 'map' } as const, 'Archive Map · DICOMFall'],
    [{ name: 'mission', missionId: 'the-preamble' } as const, 'Mission · DICOMFall'],
    [{ name: 'settings', section: null } as const, 'Settings · DICOMFall'],
    [{ name: 'not-found' } as const, 'Page not found · DICOMFall'],
  ])('titles %o as %s', (route, title) => {
    expect(documentTitleOf(route)).toBe(title)
  })
})

describe('screenTitleOf', () => {
  it("keeps the game's own title when the window is too narrow to play", () => {
    const map = { name: 'map' } as const
    expect(screenTitleOf(map, false)).toBe('DICOMFall: Learn DICOM from the first byte to the network.')
    expect(screenTitleOf(map, true)).toBe('Archive Map · DICOMFall')
  })
})
