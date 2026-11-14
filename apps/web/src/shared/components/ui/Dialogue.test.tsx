// @vitest-environment jsdom
import type { Speaker } from '@shared/types'
import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { Dialogue } from './Dialogue'

afterEach(cleanup)

const PREAMBLE: Speaker = {
  id: 'preamble',
  name: 'The Preamble',
  term: "a Part 10 file's first 128 bytes",
  portrait: <svg />,
  avatar: <svg />,
}
const VR: Speaker = {
  id: 'vr',
  name: 'VR',
  term: 'the value representation',
  portrait: <svg />,
  avatar: <svg />,
}
const NARRATOR: Speaker = { id: 'narrator', name: '', term: '', portrait: null, avatar: null }

describe('Dialogue', () => {
  it('sets narration apart as stage directions, never as a nameless speaker', () => {
    const { container } = render(
      <Dialogue
        label="Watch it"
        lines={[
          { speaker: NARRATOR, text: 'The hex pane lights up.' },
          { speaker: PREAMBLE, text: 'Who wrote zeros in me?' },
          { speaker: NARRATOR, text: 'Four bytes light up.' },
          { speaker: PREAMBLE, text: 'All of them.' },
        ]}
      />
    )
    expect(container.querySelectorAll('.df-dialogue__narration')).toHaveLength(2)
    expect(container.querySelectorAll('.df-dialogue__aside')).toHaveLength(0)
    expect(container.querySelectorAll('.df-dialogue__speaker')).toHaveLength(1)
    expect(container.querySelector('.df-dialogue__speaker b')?.textContent).toBe('The Preamble')
    expect(container.textContent).not.toContain('·')
  })

  it('gives the first speaker a header and lets another cut in with their real term', () => {
    const { container } = render(
      <Dialogue
        label="Scene"
        lines={[
          { speaker: PREAMBLE, text: 'Nothing answers.' },
          { speaker: VR, text: 'Nothing was asked.' },
        ]}
      />
    )
    expect(container.querySelector('.df-dialogue__speaker div span')?.textContent).toBe(
      "a Part 10 file's first 128 bytes"
    )
    expect(container.querySelector('.df-dialogue__name')?.textContent).toBe('VR · the value representation')
  })

  it('leaves the header out when it goes on from a dialogue above', () => {
    const { container } = render(<Dialogue label="Scene" continued lines={[{ speaker: PREAMBLE, text: 'Go on.' }]} />)
    expect(container.querySelectorAll('.df-dialogue__speaker')).toHaveLength(0)
  })
})
