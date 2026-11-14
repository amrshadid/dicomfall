// @vitest-environment jsdom
import { useGuidePace } from '@features/guide/hooks/pace'
import type { GuidePace, GuidePart, GuidePresentationProps, GuideStoryBlock } from '@features/guide/types'
import { beatsOf, pacedGuideOf } from '@features/guide/utils/story'
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { COMMANDS, HINTS, OBJECTIVES } from '@/test/fixtures/guide.fixture'
import { STORY_SCENE, STORY_SEE } from '@/test/fixtures/story.fixture'
import { GuidePresentation } from './GuidePresentation'

afterEach(cleanup)

const BASE: GuidePresentationProps = {
  stepLabel: 'See it',
  reviewNote: null,
  beats: beatsOf(STORY_SCENE),
  onContinue: null,
  showObjectives: true,
  objectives: OBJECTIVES,
  chips: [],
  hints: { by: 'The Preamble', revealed: [], left: 3, onReveal: vi.fn() },
  codex: [],
  codexOpen: false,
  note: null,
  actions: [],
}

// An unanswered question, as the pacing hands it over: answerable.
const withPick = (part: GuidePart): GuidePart => (part.kind === 'predict' ? { ...part, onPick: vi.fn() } : part)

function guide(overrides: Partial<GuidePresentationProps> = {}) {
  const props = { ...BASE, ...overrides }
  render(<GuidePresentation {...props} />)
  return props
}

/** The Guide as the mission container drives it: `finish` stands for a command finished at the console. */
function PacedGuide({ blocks, onPace }: { blocks: readonly GuideStoryBlock[]; onPace: (pace: GuidePace) => void }) {
  const pace = useGuidePace('mission#see')
  onPace(pace)
  const paced = pacedGuideOf(beatsOf(blocks), pace, false)
  return <GuidePresentation {...BASE} beats={paced.beats} onContinue={paced.onContinue} />
}

function paced(blocks: readonly GuideStoryBlock[]) {
  let latest: GuidePace | null = null
  render(<PacedGuide blocks={blocks} onPace={(pace) => (latest = pace)} />)
  return { finish: () => act(() => latest?.advance()) }
}

describe('GuidePresentation', () => {
  it('introduces the first speaker with their portrait and real term, and lets another cut in', () => {
    guide()
    const transcript = screen.getByRole('region', { name: 'See it: transcript' })
    expect(within(transcript).getByText('The Preamble')).toBeTruthy()
    expect(within(transcript).getByText('the 128 bytes at the start of a Part 10 file')).toBeTruthy()
    expect(transcript.textContent).toContain('VR · the Value Representation')
  })

  it('prints a code block as the Machine printed it', () => {
    guide({ beats: beatsOf(STORY_SEE).slice(0, 2) })
    const code = document.querySelector('pre.guide__code')
    expect(code?.textContent).toBe('ct.dcm')
  })

  it('counts the objectives met, in words as well as by its box', () => {
    guide()
    const objectives = screen.getByRole('region', { name: /^Objectives/ })
    expect(within(objectives).getByText('1 of 3 met')).toBeTruthy()
    // A word and a symbol for each, as well as the colour.
    expect(within(objectives).getAllByText('Met')).toHaveLength(1)
    expect(within(objectives).getAllByText('Not yet')).toHaveLength(2)
    expect(objectives.textContent).toContain('✓')
    expect(objectives.textContent).toContain('✗')
  })

  it('says a partly met objective in a word and with ◐', () => {
    guide({
      objectives: [
        {
          id: 'meta',
          text: 'Mark the File Meta Information.',
          passed: false,
          state: 'partly',
          observed: 'you marked bytes 132 to 143 (12 bytes): part of the File Meta Information, not all of it.',
        },
      ],
    })
    const objectives = screen.getByRole('region', { name: /^Objectives/ })
    expect(within(objectives).getByText('Partly')).toBeTruthy()
    expect(objectives.textContent).toContain('◐')
    expect(objectives.textContent).toContain('part of the File Meta Information')
  })

  it('gives an answer box with a label from the objective, Enter or Give to submit, retries free', () => {
    const onSubmit = vi.fn()
    guide({
      objectives: [
        {
          id: 'modality',
          text: 'Give the `Modality`.',
          passed: false,
          state: 'open',
          observed: '`MR` is not what the file holds there. Try again: retries are free.',
          input: { kind: 'answer', label: 'Give the `Modality`.', given: 'MR', onSubmit },
        },
      ],
    })
    const box = screen.getByRole('textbox', { name: 'Answer: Give the Modality.' })
    expect((box as HTMLInputElement).value).toBe('MR')
    expect(box.getAttribute('aria-describedby')).not.toBeNull()
    expect(screen.getByText(/is not what the file holds there/)).toBeTruthy()
    fireEvent.change(box, { target: { value: 'CT' } })
    fireEvent.submit(box)
    expect(onSubmit).toHaveBeenCalledWith('CT')
    fireEvent.change(box, { target: { value: 'XA' } })
    fireEvent.click(screen.getByRole('button', { name: 'Give' }))
    expect(onSubmit).toHaveBeenLastCalledWith('XA')
  })

  it('asks an offset box for a whole number before giving it', () => {
    const onSubmit = vi.fn()
    guide({
      objectives: [
        {
          id: 'predict',
          text: 'Predict the offset.',
          passed: false,
          state: 'open',
          input: { kind: 'offset', label: 'Predict the offset.', given: null, onSubmit },
        },
      ],
    })
    const box = screen.getByRole('textbox', { name: 'Offset: Predict the offset.' })
    fireEvent.change(box, { target: { value: 'three hundred' } })
    fireEvent.submit(box)
    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByText(/An offset is a whole number of bytes/)).toBeTruthy()
    fireEvent.change(box, { target: { value: '328' } })
    fireEvent.submit(box)
    expect(onSubmit).toHaveBeenCalledWith('328')
  })

  it('keeps the objectives back while the scene is read', () => {
    guide({ showObjectives: false })
    expect(screen.queryByRole('region', { name: /^Objectives/ })).toBeNull()
  })

  it('runs a chip at the console on a click, beside its one-line explain', () => {
    const run = vi.fn()
    guide({ chips: COMMANDS.map((chip) => ({ ...chip, onRun: () => run(chip.command) })) })
    const commands = screen.getByRole('region', { name: 'Commands to try' })
    expect(within(commands).getByText(/The first 132 bytes/)).toBeTruthy()
    fireEvent.click(within(commands).getByRole('button', { name: 'Run xxd -l 132 /lab/ct.dcm at the console' }))
    expect(run).toHaveBeenCalledWith('xxd -l 132 /lab/ct.dcm')
  })

  describe('pacing', () => {
    it('shows the text up to the pause, and the rest once a command finishes', () => {
      const { finish } = paced(STORY_SEE)
      expect(screen.queryByText(/is the instance you will follow/)).toBeNull()
      finish()
      expect(screen.getByText(/is the instance you will follow/)).toBeTruthy()
    })

    it('shows the rest on Continue too', () => {
      paced(STORY_SEE)
      fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
      expect(screen.getByText(/is the instance you will follow/)).toBeTruthy()
    })

    it('waits for an answer before going past a question, whatever is run meanwhile', () => {
      const { finish } = paced(STORY_SEE)
      finish()
      finish()
      finish()
      expect(screen.getByRole('group', { name: 'Your call, before The Preamble answers' })).toBeTruthy()
      expect(screen.queryByRole('button', { name: 'Continue' })).toBeNull()
      expect(screen.queryByText(/the prefix that tells a reader/)).toBeNull()
    })

    it('names the speaker who asked the question, or none for narration', () => {
      const question = (speaker: string | null): GuideStoryBlock[] => [
        {
          kind: 'predict',
          speaker,
          text: 'What will happen?',
          options: [
            { text: 'One thing', right: true },
            { text: 'Another', right: false },
          ],
        },
      ]
      guide({ beats: beatsOf(question('VR')).map((beat) => beat.map(withPick)) })
      expect(screen.getByRole('group', { name: 'Your call, before VR answers' })).toBeTruthy()
      cleanup()
      guide({ beats: beatsOf(question(null)).map((beat) => beat.map(withPick)) })
      expect(screen.getByRole('group', { name: 'Your call' })).toBeTruthy()
    })

    it("marks the player's call beside what happened, once the command has run, never scored", () => {
      const { finish } = paced(STORY_SEE)
      finish()
      fireEvent.click(screen.getByRole('button', { name: 'Nothing at all' }))
      const answers = screen.getByRole('list', { name: 'Answers' })
      expect(within(answers).getByText('your call')).toBeTruthy()
      expect(within(answers).queryByText('what happens')).toBeNull()
      expect(within(answers).getByText('Kept. Now do it, and see what happens.')).toBeTruthy()
      finish()
      const marked = screen.getByRole('list', { name: 'Answers' })
      const right = within(marked).getByText('what happens').closest('li')
      expect(right?.textContent).toContain('DICM')
      expect(within(marked).getByText('your call').closest('li')?.textContent).toContain('Nothing at all')
      expect(document.body.textContent).not.toMatch(/score: |points|correct!/i)
    })

    it('"Just show me" answers nothing and moves on', () => {
      const { finish } = paced(STORY_SEE)
      finish()
      fireEvent.click(screen.getByRole('button', { name: 'Just show me' }))
      expect(screen.getByText(/the prefix that tells a reader/)).toBeTruthy()
      expect(screen.queryByText('your call')).toBeNull()
    })
  })

  describe('hints', () => {
    it('offers three, a nudge first, before any is shown', () => {
      guide()
      const hints = screen.getByRole('region', { name: /hints/ })
      expect(within(hints).getByText('3 left')).toBeTruthy()
      expect(within(hints).getByText(/a nudge first, then the concept, then the spot/)).toBeTruthy()
    })

    it("names them after the stage's guide", () => {
      guide({ hints: { by: 'The SCP', revealed: [], left: 3, onReveal: vi.fn() } })
      expect(screen.getByRole('region', { name: /The SCP's hints/ })).toBeTruthy()
    })

    it('shows them one at a time, each named by its tier', () => {
      const onReveal = vi.fn()
      guide({ hints: { by: 'The Preamble', revealed: HINTS.slice(0, 1), left: 2, onReveal } })
      const hints = screen.getByRole('region', { name: /hints/ })
      expect(within(hints).getAllByRole('listitem')).toHaveLength(1)
      expect(within(hints).getByText('Hint 1, a nudge')).toBeTruthy()
      fireEvent.click(within(hints).getByRole('button', { name: 'Show the next hint' }))
      expect(onReveal).toHaveBeenCalledTimes(1)
    })

    it('shows the third hint as text alone: no hint gives a command', () => {
      guide({ hints: { by: 'The Preamble', revealed: HINTS, left: 0, onReveal: null } })
      const hints = screen.getByRole('region', { name: /hints/ })
      expect(within(hints).getByText('Hint 3, the spot')).toBeTruthy()
      expect(within(hints).getByText('none left')).toBeTruthy()
      expect(within(hints).queryByRole('button')).toBeNull()
      expect(hints.querySelector('code')).toBeNull()
    })
  })

  describe('codex', () => {
    const codex = [{ id: 'preamble', term: 'the preamble', href: '#/mission/m?card=preamble' }]

    it('folds the cards to one line until the terms are met', () => {
      guide({ codex })
      expect(screen.getByText('1 card for this mission')).toBeTruthy()
    })

    it('lays them open as links over the mission', () => {
      guide({ codex, codexOpen: true })
      const section = screen.getByRole('region', { name: 'Codex' })
      expect(within(section).getByRole('link', { name: 'the preamble' }).getAttribute('href')).toBe(
        '#/mission/m?card=preamble'
      )
    })
  })

  it('keeps an action that waits focusable and says why', () => {
    const onSelect = vi.fn()
    guide({
      actions: [
        {
          id: 'start-over',
          label: 'Start over',
          kind: 'quiet',
          unavailable: 'The lab is still being built.',
          onSelect,
        },
      ],
    })
    const button = screen.getByRole('button', { name: /Start over/ })
    expect(button.getAttribute('aria-disabled')).toBe('true')
    fireEvent.click(button)
    expect(onSelect).not.toHaveBeenCalled()
  })
})
