// @vitest-environment jsdom
import type { UseActiveMissionResult } from '@dicomfall/game/hooks'
import { type MissionVerdict, NO_PLAYER_ACTIONS, type PlayerActions } from '@dicomfall/game/types'
import type { UseMissionLabResult } from '@features/mission/hooks/lab'
import { MISSION_FIXTURE } from '@features/mission/utils/fixtures'
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { MissionContainer, type MissionView } from './MissionContainer'

const MISSION_ID = MISSION_FIXTURE.id

const mocks = vi.hoisted(() => ({
  active: null as unknown,
  run: null as unknown,
  start: vi.fn(),
  begin: vi.fn(),
  replay: vi.fn(() => Promise.resolve({ success: true })),
  finished: null as ((count: number, lines?: readonly string[]) => void) | null,
  showDebrief: vi.fn(),
  leave: vi.fn(),
  startOver: vi.fn(() => Promise.resolve()),
  missionLabOf: vi.fn(),
  ae: 'workstation' as string | null,
  select: vi.fn(),
  play: null as unknown,
  playOf: vi.fn(),
}))

vi.mock('@dicomfall/game/hooks', () => ({
  useProgress: () => ({ isOpen: true }),
  useMissionActions: () => ({
    start: mocks.start,
    begin: mocks.begin,
    replay: mocks.replay,
    showDebrief: mocks.showDebrief,
    leave: mocks.leave,
  }),
  useActiveMission: () => mocks.active,
  useHints: () => ({ revealed: [], left: 3, next: 'nudge', reveal: vi.fn() }),
}))
vi.mock('@features/mission/hooks/lab', () => ({
  useMissionLab: (mission: unknown) => {
    mocks.missionLabOf(mission)
    return mocks.run
  },
}))
vi.mock('@features/mission/hooks/play', () => ({
  useMissionPlay: (_mission: unknown, labPhase: string, key: string) => {
    mocks.playOf(labPhase, key)
    return mocks.play
  },
}))
vi.mock('@dicomfall/machine/hooks', () => ({
  useMachineStatus: () => ({ phase: 'ready', detail: null }),
  useAeSelection: () => ({ ae: mocks.ae, select: mocks.select }),
  useCommandFinished: (callback: (count: number, lines?: readonly string[]) => void) => {
    mocks.finished = callback
  },
}))
vi.mock('@features/chrome/hooks/screen', () => ({
  useScreenChrome: () => ({
    themeLabel: 'Night print',
    onToggleTheme: () => {},
    storageIssue: null,
    onExport: null,
    onTour: null,
  }),
}))
vi.mock('@features/chrome/hooks/save', () => ({
  useSaveStatus: () => ({ saveState: 'saved', lastSavedAt: null, storageIssue: null }),
}))
vi.mock('@features/tour/hooks/tour', () => ({ useTourScreen: () => {} }))

// The content on disk changes as missions are written: the screen is tested on a fixed one.
vi.mock('@features/content/hooks/content', async () => {
  const { CONTENT_FIXTURE } = await import('@features/mission/utils/fixtures')
  return { useContent: () => CONTENT_FIXTURE }
})

const mission = MISSION_FIXTURE
const PASSED: MissionVerdict = { passed: true, objectives: [] }

const NONE: UseActiveMissionResult = { mission: null, phase: null, verdict: null, record: null, isCompleted: false }

function activeAt(phase: UseActiveMissionResult['phase'], isCompleted = false): UseActiveMissionResult {
  return { mission, phase, verdict: null, record: null, isCompleted }
}

function labAt(phase: UseMissionLabResult['phase']): UseMissionLabResult {
  return { phase, errors: [], startOver: mocks.startOver }
}

function playWith(verdict: MissionVerdict | null, selection: PlayerActions['selection'] = null) {
  return {
    verdict,
    actions: { ...NO_PLAYER_ACTIONS, selection },
    files: ['/lab/ct.dcm'],
    file: '/lab/ct.dcm',
    selectFile: vi.fn(),
    reading: { phase: 'idle', reading: null, bytes: null, errors: [], reload: vi.fn() },
    mark: vi.fn(),
    answer: vi.fn(),
    predict: vi.fn(),
  }
}

const metVerdict = (met: number): MissionVerdict => ({
  passed: met === mission.objectives.length,
  objectives: mission.objectives.map((objective, at) => ({
    objectiveId: objective.id,
    result: {
      kind: 'selected',
      passed: at < met,
      failure: at < met ? null : 'not_marked',
      file: '/lab/ct.dcm',
      target: 'preamble',
      part: null,
      expected: null,
      marked: null,
    },
  })),
})

function screenOf(missionId: string, views: MissionView[] = []) {
  return (
    <MissionContainer
      missionId={missionId}
      guide={(view) => {
        views.push(view)
        return <p>guide slot</p>
      }}
      terminal={() => <p>terminal slot</p>}
      inspector={() => <p>inspector slot</p>}
      preview={() => <p>preview slot</p>}
      uids={() => <p>uids slot</p>}
      timeline={<p>timeline slot</p>}
      debrief={(view) => (
        <button type="button" onClick={view.onPlayAgain}>
          debrief slot
        </button>
      )}
      notFound={<p>no such page</p>}
    />
  )
}

function mount(missionId = MISSION_ID) {
  const views: MissionView[] = []
  const rendered = render(screenOf(missionId, views))
  return { ...rendered, lastView: () => views.at(-1), redraw: () => rendered.rerender(screenOf(missionId, views)) }
}

beforeAll(() => {
  // jsdom has no modal dialogs; the layout only needs them to open and close.
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.open = true
  }
  HTMLDialogElement.prototype.close = function close() {
    this.open = false
  }
})

beforeEach(() => {
  mocks.active = NONE
  mocks.run = labAt('building')
  mocks.play = playWith(null)
  mocks.ae = 'workstation'
  mocks.start.mockResolvedValue({ success: true })
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('MissionContainer', () => {
  it('shows the not-found page for an address that names no mission, and opens nothing', () => {
    mount('no-such-mission')
    expect(screen.getByText('no such page')).toBeTruthy()
    expect(mocks.start).not.toHaveBeenCalled()
  })

  it("puts the console in the lab's console AE once the lab is built, and not before", () => {
    mocks.active = activeAt('play')
    mocks.ae = null
    mocks.run = labAt('building')
    const { redraw } = mount()
    expect(mocks.select).not.toHaveBeenCalled()
    mocks.run = labAt('ready')
    redraw()
    expect(mocks.select).toHaveBeenCalledWith('workstation')
  })

  it('leaves the console where it is when an AE is already selected', () => {
    mocks.active = activeAt('play')
    mocks.run = labAt('ready')
    mount()
    expect(mocks.select).not.toHaveBeenCalled()
  })

  it('opens the mission by its id and draws nothing until the game has it', () => {
    mount()
    expect(mocks.start).toHaveBeenCalledWith(MISSION_ID)
    expect(screen.queryByText('guide slot')).toBeNull()
    expect(mocks.missionLabOf).toHaveBeenLastCalledWith(null)
  })

  it('tells the scene beside the Lightbox and the Console, with the Machine already starting', () => {
    mocks.active = activeAt('incident')
    const { lastView } = mount()
    expect(screen.getByRole('heading', { level: 1, name: 'The Four Regions' })).toBeTruthy()
    expect(screen.getByText('Stage 1 · The First File')).toBeTruthy()
    expect(screen.getByText('guide slot')).toBeTruthy()
    expect(screen.getByText('terminal slot')).toBeTruthy()
    expect(screen.getByText('preview slot')).toBeTruthy()
    expect(screen.getByText('uids slot')).toBeTruthy()
    expect(screen.getByText('timeline slot')).toBeTruthy()
    expect(screen.queryByText('inspector slot')).toBeNull()
    expect(mocks.missionLabOf).toHaveBeenLastCalledWith(mission)
    expect(lastView()).toMatchObject({ step: 'scene', reviewing: null })
    act(() => lastView()?.onNext?.())
    expect(mocks.begin).toHaveBeenCalledOnce()
  })

  it('names the lab in the title block and the page by its mission number', () => {
    mocks.active = activeAt('play')
    mocks.run = labAt('ready')
    mount()
    expect(screen.getByText('1 AE, 0 links')).toBeTruthy()
    // In the title block, and over the Console, whose shell it is.
    expect(screen.getAllByText('AE workstation')).toHaveLength(2)
    expect(screen.getByText('1 fixture')).toBeTruthy()
    expect(screen.getAllByText('The Four Regions(1.1)').length).toBeGreaterThan(0)
  })

  it('opens the Inspector with See it', () => {
    mocks.active = activeAt('play')
    mocks.run = labAt('ready')
    const { lastView } = mount()
    expect(lastView()?.step).toBe('see')
    expect(screen.getByText('inspector slot')).toBeTruthy()
    // See it asks a question: the way on waits for the player's call.
    expect(lastView()?.onNext).toBeNull()
    act(() => lastView()?.pace.pick(0, 1, 2))
    act(() => lastView()?.onNext?.())
    expect(lastView()?.step).toBe('build')
    expect(lastView()?.onNext).toBeNull()
  })

  it('offers no way on until the step’s question is answered, "just show me" included', () => {
    mocks.active = activeAt('play')
    mocks.run = labAt('ready')
    const { lastView } = mount()
    expect(lastView()?.onNext).toBeNull()
    act(() => lastView()?.pace.pick(0, null, 3))
    expect(lastView()?.onNext).not.toBeNull()
  })

  it('releases a pause only on the command its beat asked for', () => {
    mocks.active = activeAt('play')
    mocks.run = labAt('ready')
    const { lastView } = mount()
    expect(lastView()?.pace.shown).toBe(1)
    act(() => mocks.finished?.(1, ['workstation:~# ls /lba']))
    expect(lastView()?.pace.shown).toBe(1)
    act(() => mocks.finished?.(2, ['workstation:~# ls /lab']))
    expect(lastView()?.pace.shown).toBe(2)
  })

  it('releases a pause on any finished command while the Machine does not say what was typed', () => {
    mocks.active = activeAt('play')
    mocks.run = labAt('ready')
    const { lastView } = mount()
    act(() => mocks.finished?.(1))
    expect(lastView()?.pace.shown).toBe(2)
  })

  it('tells the Guide when Build it was reached by skipping See it', () => {
    mocks.active = activeAt('incident')
    const { lastView, redraw } = mount()
    expect(lastView()?.skippedSeeIt).toBe(false)
    act(() => lastView()?.onSkipToBuild?.())
    mocks.active = activeAt('play')
    redraw()
    expect(lastView()).toMatchObject({ step: 'build', skippedSeeIt: true })
  })

  it('moves Build it on to Watch it once the game keeps a passing verdict', () => {
    mocks.active = { ...activeAt('play'), verdict: PASSED }
    mocks.run = labAt('ready')
    const { lastView } = mount()
    expect(lastView()?.step).toBe('watch')
    act(() => lastView()?.onNext?.())
    expect(mocks.showDebrief).toHaveBeenCalledOnce()
  })

  it('lays the debrief over the Bench and the Lightbox once the player opens it', () => {
    mocks.active = activeAt('play', true)
    const playing = mount()
    expect(screen.queryByText('debrief slot')).toBeNull()
    playing.unmount()

    mocks.active = activeAt('debrief', true)
    mount()
    expect(screen.getByText('debrief slot')).toBeTruthy()
  })

  it('closes the mission when the page is left', () => {
    mocks.active = activeAt('play')
    const { unmount } = mount()
    expect(mocks.leave).not.toHaveBeenCalled()
    unmount()
    expect(mocks.leave).toHaveBeenCalledTimes(1)
  })

  it('says why a mission the game refuses cannot be played', async () => {
    mocks.start.mockResolvedValue({
      success: false,
      error: { code: 'locked', message: 'Finish the mission before it.' },
    })
    mount()
    await act(async () => {})
    expect(screen.getByText('Finish the mission before it.')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Back to the title' })).toBeTruthy()
  })

  it("puts the console back in the lab's console AE after starting over", async () => {
    mocks.active = activeAt('play')
    mocks.run = labAt('ready')
    mocks.ae = 'archive'
    const { lastView } = mount()
    act(() => lastView()?.onStartOver())
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Start again' }))
    await act(async () => {})
    expect(mocks.select).toHaveBeenCalledWith('workstation')
  })

  it("replays from the top bar as Kernelfall's does: asked first, then back to the scene with every hint", () => {
    mocks.active = activeAt('play')
    mocks.run = labAt('ready')
    const { lastView, redraw } = mount()
    act(() => lastView()?.pace.pick(0, 1, 2))
    act(() => lastView()?.onNext?.())
    fireEvent.click(screen.getByRole('button', { name: 'Replay this mission' }))
    const dialog = screen.getByRole('dialog', { name: 'Replay this mission?' })
    expect(within(dialog).getByText(/starts again from its scene/)).toBeTruthy()
    expect(within(dialog).getByText(/steps and\s+hints are dropped/)).toBeTruthy()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Replay from the scene' }))
    expect(mocks.startOver).toHaveBeenCalledTimes(1)
    expect(mocks.replay).toHaveBeenCalledTimes(1)
    mocks.active = activeAt('incident')
    redraw()
    expect(lastView()).toMatchObject({ step: 'scene', startedOver: true })
  })

  it('keeps the top bar’s Replay back while the lab is being put back, and says why', () => {
    mocks.active = activeAt('play')
    mocks.run = labAt('restoring')
    mount()
    fireEvent.click(screen.getByRole('button', { name: 'Replay this mission' }))
    const dialog = screen.getByRole('dialog', { name: 'Replay this mission?' })
    expect(within(dialog).getByText(/The lab is being put back\./)).toBeTruthy()
    expect(within(dialog).queryByRole('button', { name: 'Replay from the scene' })).toBeNull()
    expect(mocks.replay).not.toHaveBeenCalled()
  })

  it('starts over only after asking, and only while the lab is the player’s to use', () => {
    mocks.active = activeAt('play')
    mocks.run = labAt('ready')
    const ready = mount()
    act(() => ready.lastView()?.onStartOver())
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Start again' }))
    expect(mocks.startOver).toHaveBeenCalledTimes(1)
    expect(mocks.replay).not.toHaveBeenCalled()
    ready.unmount()

    mocks.run = labAt('building')
    const { lastView } = mount()
    act(() => lastView()?.onStartOver())
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText(/The lab is still being built\./)).toBeTruthy()
    expect(within(dialog).queryByRole('button', { name: 'Start again' })).toBeNull()
  })

  it('ends a look back at a done step from the Guide', () => {
    mocks.active = activeAt('play')
    mocks.run = labAt('ready')
    const { lastView } = mount()
    act(() => lastView()?.pace.pick(0, 1, 2))
    act(() => lastView()?.onNext?.())
    act(() => lastView()?.pace.advance())
    fireEvent.click(screen.getByRole('button', { name: /See it/ }))
    expect(lastView()).toMatchObject({ step: 'build', reviewing: 'see' })
    // Looking back leaves the current step's story where the player was.
    expect(lastView()?.pace.shown).toBe(2)
    act(() => lastView()?.onEndReview())
    expect(lastView()).toMatchObject({ step: 'build', reviewing: null })
  })

  it("replays from the scene on a reset lab, as Kernelfall's Replay level, with the saved verdict set aside", () => {
    mocks.active = { ...activeAt('debrief', true), verdict: PASSED }
    mocks.run = labAt('ready')
    const { lastView, redraw } = mount()
    expect(lastView()?.startedOver).toBe(false)
    fireEvent.click(screen.getByRole('button', { name: 'debrief slot' }))
    expect(mocks.startOver).toHaveBeenCalledTimes(1)
    expect(mocks.replay).toHaveBeenCalledTimes(1)
    expect(mocks.begin).not.toHaveBeenCalled()
    // The game reopens the mission at its incident once replay() is called.
    mocks.active = activeAt('incident', true)
    redraw()
    expect(lastView()).toMatchObject({ step: 'scene', reviewing: null, startedOver: true })
    expect(lastView()?.pace.shown).toBe(1)
  })

  it('judges each play-through by its own key and hands it to the slots that read the file', () => {
    mocks.active = activeAt('play')
    mocks.run = labAt('ready')
    const { lastView } = mount()
    expect(mocks.playOf).toHaveBeenLastCalledWith('ready', `${MISSION_ID}#0`)
    expect(lastView()?.play).toBe(mocks.play)
  })

  it('offers Watch it from Build it once the live verdict meets every objective', () => {
    mocks.active = activeAt('play')
    mocks.run = labAt('ready')
    const { lastView, redraw } = mount()
    act(() => lastView()?.pace.pick(0, 1, 2))
    act(() => lastView()?.onNext?.())
    expect(lastView()?.step).toBe('build')
    // Build it asks a question of its own first.
    act(() => lastView()?.pace.pick(0, 0, 2))
    expect(lastView()?.onNext).toBeNull()
    mocks.play = playWith(metVerdict(2))
    redraw()
    expect(lastView()?.onNext).toBeNull()
    mocks.play = playWith(metVerdict(3))
    redraw()
    act(() => lastView()?.onNext?.())
    expect(lastView()?.step).toBe('watch')
  })

  it('never lets a mark release a pause that waits for a command', () => {
    mocks.active = activeAt('play')
    mocks.run = labAt('ready')
    const { lastView, redraw } = mount()
    mocks.play = playWith(metVerdict(1), { file: '/lab/ct.dcm', from: 0, to: 128 })
    redraw()
    expect(lastView()?.pace.shown).toBe(1)
  })

  it('asks Play it again to wait while the lab is being built', () => {
    mocks.active = activeAt('debrief', true)
    mocks.run = labAt('building')
    mount()
    fireEvent.click(screen.getByRole('button', { name: 'debrief slot' }))
    expect(mocks.startOver).not.toHaveBeenCalled()
    expect(mocks.replay).not.toHaveBeenCalled()
    const dialog = screen.getByRole('dialog', { name: 'Replay this mission?' })
    expect(within(dialog).getByText(/The lab is still being built\./)).toBeTruthy()
  })
})
