import type { Speaker } from '@shared/types'
import { describe, expect, it } from 'vitest'
import { groupLines } from './dialogue.util'

const speaker = (id: string): Speaker => ({
  id,
  name: id,
  term: '',
  portrait: null,
  avatar: null,
})

describe('groupLines', () => {
  it('joins consecutive lines by the same speaker', () => {
    const preamble = speaker('preamble')
    const vr = speaker('vr')
    const groups = groupLines([
      { speaker: preamble, text: 'a' },
      { speaker: preamble, text: 'b' },
      { speaker: vr, text: 'c' },
      { speaker: preamble, text: 'd' },
    ])
    expect(groups.map((group) => [group.speaker.id, group.texts])).toEqual([
      ['preamble', ['a', 'b']],
      ['vr', ['c']],
      ['preamble', ['d']],
    ])
  })

  it('returns nothing for an empty scene', () => {
    expect(groupLines([])).toEqual([])
  })
})
