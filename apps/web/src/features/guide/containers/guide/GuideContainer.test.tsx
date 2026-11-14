// @vitest-environment jsdom
import type { UseActiveMissionResult } from '@dicomfall/game/hooks'
import { type MissionVerdict, NO_PLAYER_ACTIONS, type RevealedHint } from '@dicomfall/game/types'
import { useGuidePace } from '@features/guide/hooks/pace'
import type { GuidePace, GuideStepId } from '@features/guide/types'
import type { UseMissionLabResult } from '@features/mission/hooks/lab'
import { MISSION_FIXTURE } from '@features/mission/utils/fixtures'
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { GuideContainer, type GuideContainerProps } from './GuideContainer'

const mocks = vi.hoisted(() => ({
  active: null as unknown,
  revealed: [] as unknown[],
  reveal: vi.fn(),
  run: vi.fn(),
  pace: null as GuidePace | null,
}))

vi.mock('@dicomfall/game/hooks', () => ({
  useActiveMission: () => mocks.active,
  useHints: () => ({
    revealed: mocks.revealed,
    left: 3 - mocks.revealed.length,
    next: mocks.revealed.length < 3 ? 'nudge' : null,
    reveal: mocks.reveal,
  }),
}))

vi.mock('@dicomfall/machine/hooks', () => ({
  useMachineStatus: () => ({ phase: 'ready', detail: null }),
  useTerminalCommand: () => ({ run: mocks.run }),
}))

// The content on disk changes as missions are written: the Guide is tested on a fixed one.
vi.mock('@features/content/hooks/content', async () => {
  const { CONTENT_FIXTURE } = await import('@features/mission/utils/fixtures')
  return { useContent: () => CONTENT_FIXTURE }
})

const active = (phase: UseActiveMissionResult['phase']): UseActiveMissionResult => ({
  mission: MISSION_FIXTURE,
  phase,
  verdict: null,
  record: null,
  isCompleted: false,
})

const verdictOf = (passed: readonly boolean[]): MissionVerdict => ({
  passed: passed.every(Boolean),
  objectives: MISSION_FIXTURE.objectives.map((objective, at) => ({
    objectiveId: objective.id,
    result: {
      kind: 'file',
      passed: passed[at] ?? false,
      failure: passed[at] ? null : 'wrong_attribute',
      file: '/lab/ct.dcm',
      transferSyntax: null,
      attributes: [],
    },
  })),
})

function mount(
  step: GuideStepId,
  overrides: {
    reviewing?: GuideStepId | null
    onNext?: () => void
    startedOver?: boolean
    phase?: UseMissionLabResult['phase']
    errors?: readonly string[]
  } = {}
) {
  const props = {
    run: { phase: overrides.phase ?? 'ready', errors: overrides.errors ?? [] } as Pick<
      UseMissionLabResult,
      'phase' | 'errors'
    >,
    step,
    reviewing: overrides.reviewing ?? null,
    onEndReview: vi.fn(),
    startedOver: overrides.startedOver ?? false,
    onNext: overrides.onNext ?? null,
    onSkipToBuild: step === 'scene' ? vi.fn() : null,
    onStartOver: vi.fn(),
  }
  render(<Harness {...props} />)
  return props
}

// The screen keeps the pace beside the step; here a harness does.
function Harness(props: Omit<GuideContainerProps, 'pace'>) {
  const pace = useGuidePace(`m#${props.step}`)
  mocks.pace = pace
  return <GuideContainer {...props} pace={pace} />
}

beforeEach(() => {
  mocks.active = active('play')
  mocks.revealed = []
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('GuideContainer', () => {
  it('tells the scene first, with the way on and a skip to Build it, and keeps the objectives back', () => {
    mocks.active = active('incident')
    const onNext = vi.fn()
    mount('scene', { onNext })
    expect(screen.getByText(/The lab is quiet/)).toBeTruthy()
    expect(screen.queryByRole('region', { name: /^Objectives/ })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /Next: See it/ }))
    expect(onNext).toHaveBeenCalledOnce()
    expect(screen.getByRole('button', { name: 'Skip to Build it' })).toBeTruthy()
  })

  it('shows the next beat when the screen releases the pause, and offers Continue on every pause', () => {
    mount('see')
    expect(screen.queryByText(/is the instance you will follow/)).toBeNull()
    expect(screen.getByRole('button', { name: 'Continue' })).toBeTruthy()
    act(() => mocks.pace?.advance())
    expect(screen.getByText(/is the instance you will follow/)).toBeTruthy()
  })

  it('offers Watch it from Build it when the container gives the way on', () => {
    const onNext = vi.fn()
    mount('build', { onNext })
    fireEvent.click(screen.getByRole('button', { name: /Next: Watch it/ }))
    expect(onNext).toHaveBeenCalledOnce()
  })

  it('runs a chip at the console on a click', () => {
    mount('build')
    fireEvent.click(screen.getByRole('button', { name: 'Run ls /lab at the console' }))
    expect(mocks.run).toHaveBeenCalledWith('ls /lab')
  })

  it('has no Submit button: objectives tick by themselves; Start over stays', () => {
    const props = mount('build')
    expect(screen.queryByRole('button', { name: /Submit|Check my work/ })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Start over' }))
    expect(props.onStartOver).toHaveBeenCalledOnce()
    expect(screen.getByText(/Objectives tick on their own/)).toBeTruthy()
  })

  it('says while the lab is built, keeps Start over back, and raises a failed build', () => {
    mount('see', { phase: 'building' })
    expect(screen.getByRole('status').textContent).toContain('Building the lab')
    expect(screen.getByRole('button', { name: /Start over/ }).getAttribute('aria-disabled')).toBe('true')
    cleanup()
    mount('see', { phase: 'failed', errors: ['cp: /lab/fixtures/x.dcm: No such file or directory'] })
    const alert = screen.getByRole('alert')
    expect(alert.textContent).toContain('The lab could not be built')
    expect(alert.textContent).toContain('No such file or directory')
  })

  it('reveals the mission hints one at a time, named nudge, concept, spot, as text alone', () => {
    mount('build')
    fireEvent.click(screen.getByRole('button', { name: 'Show a hint' }))
    expect(mocks.reveal).toHaveBeenCalledOnce()
    cleanup()
    mocks.revealed = MISSION_FIXTURE.hints.map(
      (hint, index): RevealedHint => ({ tier: (['nudge', 'concept', 'spot'] as const)[index] ?? 'spot', ...hint })
    )
    mount('build')
    const hints = screen.getByRole('region', { name: /hints/ })
    expect(within(hints).getByText('Hint 3, the spot')).toBeTruthy()
    expect(within(hints).queryByRole('button', { name: /Copy/ })).toBeNull()
    expect(screen.getByRole('heading', { name: /The Preamble's hints/ })).toBeTruthy()
  })

  it("links the mission's Codex cards over the mission, laid open once watching", () => {
    mount('watch')
    const codex = screen.getByRole('region', { name: 'Codex' })
    expect(within(codex).getByRole('link', { name: 'the preamble' }).getAttribute('href')).toBe(
      '#/mission/the-four-regions?card=preamble'
    )
  })

  it('shows a step looked back at whole, with a note that progress is kept', () => {
    mount('build', { reviewing: 'see' })
    expect(screen.getByText('Looking again at See it. Your progress is kept.')).toBeTruthy()
    expect(screen.getByText(/the prefix that tells a reader this is a Part 10 file/)).toBeTruthy()
  })

  it('offers only the way back to the current step while looking back', () => {
    const props = mount('build', { reviewing: 'see' })
    fireEvent.click(screen.getByRole('button', { name: 'Back to Build it' }))
    expect(props.onEndReview).toHaveBeenCalledOnce()
    expect(screen.queryByRole('button', { name: 'Start over' })).toBeNull()
  })

  it('ticks the objectives the game kept, and sets them aside once the lab was started over', () => {
    mocks.active = { ...active('play'), verdict: verdictOf([true, false, false]) }
    mount('see')
    expect(screen.getByText('1 of 3 met')).toBeTruthy()
    cleanup()
    mount('see', { startedOver: true })
    expect(screen.getByText('0 of 3 met')).toBeTruthy()
  })

  it('ticks the objectives from the live verdict once the play-through is judged', () => {
    const play = {
      verdict: verdictOf([true, true, false]),
      actions: NO_PLAYER_ACTIONS,
      answer: vi.fn(),
      predict: vi.fn(),
    }
    render(
      <Harness
        run={{ phase: 'ready', errors: [] }}
        step="build"
        reviewing={null}
        onEndReview={vi.fn()}
        startedOver
        onNext={null}
        onSkipToBuild={null}
        onStartOver={vi.fn()}
        play={play}
      />
    )
    expect(screen.getByText('2 of 3 met')).toBeTruthy()
    expect(screen.getAllByText('Met')).toHaveLength(2)
  })

  it('shows the passing verdict beside the debrief, even after a start over', () => {
    mocks.active = { ...active('debrief'), verdict: verdictOf([true, true, true]) }
    mount('debrief', { startedOver: true })
    expect(screen.getByText('3 of 3 met')).toBeTruthy()
  })

  it('draws each guide in the portrait box, with an initial until the portrait is drawn', () => {
    mocks.active = active('incident')
    mount('scene')
    const portrait = document.querySelector('svg.df-portrait')
    expect(portrait?.getAttribute('viewBox')).toBe('0 0 56 56')
    expect(portrait?.textContent).toBe('P')
  })

  it('ends the story with the debrief and the real world', () => {
    mocks.active = active('debrief')
    mount('debrief')
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    expect(screen.getByRole('heading', { name: 'In the real world' })).toBeTruthy()
    expect(screen.getByText(/the same commands read any DICOM file you have/)).toBeTruthy()
  })
})
