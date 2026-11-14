import { appContent } from '@dicomfall/missions/utils'
import { describe, expect, it } from 'vitest'
import { documentTitleOf, screenTitleOf } from './document-title.util'

const loaded = appContent()
if (!loaded.ok) {
  throw new Error(loaded.errors.join('\n'))
}
const content = loaded.value
const firstMission = content.game.missions[0]

describe('documentTitleOf', () => {
  it.each([
    [{ name: 'title' } as const, 'DICOMFall: Learn DICOM from the first byte to the network.'],
    [{ name: 'map' } as const, 'Archive Map · DICOMFall'],
    [{ name: 'mission', missionId: 'nope' } as const, 'Mission · DICOMFall'],
    [{ name: 'codex', cardId: null } as const, 'Codex · DICOMFall'],
    [{ name: 'settings', section: null } as const, 'Settings · DICOMFall'],
    [{ name: 'not-found' } as const, 'Page not found · DICOMFall'],
  ])('titles %o as %s', (route, title) => {
    expect(documentTitleOf(route, content)).toBe(title)
  })

  // The missions are still being written: the test names whichever comes first, once there is one.
  it.runIf(firstMission !== undefined)('names a mission by its title', () => {
    const mission = firstMission as NonNullable<typeof firstMission>
    expect(documentTitleOf({ name: 'mission', missionId: mission.id }, content)).toBe(`${mission.title} · DICOMFall`)
  })
})

describe('screenTitleOf', () => {
  it('names the screen that replaces the route when content fails or the window is narrow', () => {
    const map = { name: 'map' } as const
    expect(screenTitleOf(map, null, true)).toBe('Content errors · DICOMFall')
    expect(screenTitleOf(map, content, false)).toBe('DICOMFall: Learn DICOM from the first byte to the network.')
    expect(screenTitleOf(map, content, true)).toBe('Archive Map · DICOMFall')
  })
})
