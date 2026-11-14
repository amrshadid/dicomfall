import type { MissionDefinition } from '@dicomfall/game/types'
import { describe, expect, it } from 'vitest'
import { defaultFileOf, labFilesOf } from './lab-files.util'

const lab = (...to: string[]): Pick<MissionDefinition, 'lab'> => ({
  lab: { aes: [], links: [], files: to.map((path) => ({ fixture: 'x.dcm', to: path })), console: 'workstation' },
})

const objectives = (...files: string[]): Pick<MissionDefinition, 'objectives'> => ({
  objectives: files.map((file, at) => ({
    id: `o${at}`,
    text: 'Mark it.',
    check: { kind: 'selected', file, region: 'preamble' },
  })),
})

describe('labFilesOf', () => {
  it('lists each file the lab copies once, leaving folders to the player', () => {
    expect(labFilesOf(lab('/lab/a.dcm', '/lab/series/', '/lab/b.dcm', '/lab/a.dcm'))).toEqual([
      '/lab/a.dcm',
      '/lab/b.dcm',
    ])
  })
})

describe('defaultFileOf', () => {
  it("opens the file the first file objective is about, as a capstone's second file", () => {
    expect(defaultFileOf(objectives('/lab/b.dcm'), ['/lab/a.dcm', '/lab/b.dcm'])).toBe('/lab/b.dcm')
  })

  it("opens the lab's first file when no objective names one of them", () => {
    expect(defaultFileOf(objectives('/lab/received/x.dcm'), ['/lab/a.dcm'])).toBe('/lab/a.dcm')
    expect(defaultFileOf(objectives(), [])).toBeNull()
  })
})
