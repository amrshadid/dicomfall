import { appContent } from '@dicomfall/missions/utils'
import type { GuideBeat } from '@features/guide/types'
import { describe, expect, it } from 'vitest'
import { askedCommandOf, beatCommandsOf, releasesPause } from './guide-command.util'
import { beatsOf, blocksFor } from './guide-story.util'

const beat = (...texts: string[]): GuideBeat => [
  { kind: 'lines', lines: texts.map((text) => ({ speaker: 'The Preamble', text })) },
]

describe('askedCommandOf', () => {
  it('finds the command a line asks for, by an asking word, a colon or a sentence of its own', () => {
    expect(askedCommandOf('The fixtures are in one folder: type `ls /lab`.')).toBe('ls /lab')
    expect(askedCommandOf('Look at the file: `go-dicom show /lab/ct.dcm`.')).toBe('go-dicom show /lab/ct.dcm')
    expect(askedCommandOf('`go-dicom info /lab/ct.dcm`.')).toBe('go-dicom info /lab/ct.dcm')
    expect(askedCommandOf('`ls -l /lab` again.')).toBe('ls -l /lab')
  })

  it('passes over spans the line only names, after the command or instead of one', () => {
    expect(askedCommandOf('Type `xxd -l 132 /lab/ct.dcm`. `-l 132` stops after the prefix.')).toBe(
      'xxd -l 132 /lab/ct.dcm'
    )
    expect(askedCommandOf('The element `(0002,0010)`: `UI`, the VR you met.')).toBeNull()
    expect(askedCommandOf('Its value is `1.2.840.10008.1.2.1`. The prompt says `workstation:~#`.')).toBeNull()
    expect(askedCommandOf('`DICM` sits at byte `128`.')).toBeNull()
  })
})

describe('beatCommandsOf', () => {
  it('names the last command each beat asks for, or none', () => {
    const beats = [beat('Type `ls /lab`.'), beat('Nothing to type here.'), beat('First `cd /lab`. Then `ls`.')]
    expect(beatCommandsOf(beats)).toEqual(['ls /lab', null, 'ls'])
  })
})

describe('releasesPause', () => {
  it('takes the command asked for, behind a prompt or not, its spaces and quotes aside', () => {
    expect(releasesPause('ls /lab', 'workstation:~# ls /lab')).toBe(true)
    expect(releasesPause('ls /lab', 'ls   /lab')).toBe(true)
    expect(releasesPause('go-dicom show /lab/ct.dcm', "archive:/lab# go-dicom show '/lab/ct.dcm'")).toBe(true)
    expect(releasesPause('ls /lab', 'dicomfall:~# ls /lab')).toBe(true)
  })

  it('refuses a different command, a word more or less, another case, or a word cut short', () => {
    expect(releasesPause('ls -l /lab', 'ls /lab')).toBe(false)
    expect(releasesPause('go-dicom show /lab/ct.dcm', 'go-dicom show /lab/mr.dcm')).toBe(false)
    expect(releasesPause('ls /lab', 'LS /lab')).toBe(false)
    expect(releasesPause('go-dicom show /lab/ct.dcm', 'go-dicom sh /lab/ct.dcm')).toBe(false)
  })

  it('lets any command through where the beat asks for none, or the Machine does not say what was typed', () => {
    expect(releasesPause(null, 'ls')).toBe(true)
    expect(releasesPause('ls /lab', undefined)).toBe(true)
  })

  it('leaves a beat that asks for `?` to Continue: the line never runs', () => {
    expect(releasesPause('?', undefined)).toBe(false)
  })
})

describe('the stories on disk', () => {
  const loaded = appContent()
  if (!loaded.ok) {
    throw new Error(loaded.errors.join('\n'))
  }
  const { game, storyOf } = loaded.value
  const commandsOf = (id: string, step: 'see' | 'build' | 'watch') =>
    beatCommandsOf(beatsOf(blocksFor(step, storyOf(id)?.sections)))

  // Holds for every mission written so far, however many there are.
  it('asks only for things a player can type', () => {
    for (const mission of game.missions) {
      for (const step of ['see', 'build', 'watch'] as const) {
        for (const command of commandsOf(mission.id, step)) {
          expect(command ?? 'none', `${mission.id} ${step}`).toMatch(/^(?:none|[a-z/?])/)
          expect(command ?? 'none', `${mission.id} ${step}`).not.toMatch(/[#>]$/)
        }
      }
    }
  })
})
