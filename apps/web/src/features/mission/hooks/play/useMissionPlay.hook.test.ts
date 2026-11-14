// @vitest-environment jsdom
import type { MissionDefinition } from '@dicomfall/game/types'
import type { MissionLabPhase } from '@features/mission/hooks/lab'
import { MISSION_FIXTURE } from '@features/mission/utils/fixtures'
import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CT_EXPLICIT_READING } from '@/test/fixtures/show-reading.fixture'
import { useMissionPlay } from './useMissionPlay.hook'

const FILE = '/lab/ct-explicit-le.dcm'

const mocks = vi.hoisted(() => ({
  recordAttempt: vi.fn(() => Promise.resolve({ success: true })),
  readShow: vi.fn(),
  run: vi.fn(() => Promise.resolve(null)),
  reload: vi.fn(),
  readingOf: vi.fn(),
  finished: null as (() => void) | null,
}))

vi.mock('@dicomfall/game/hooks', () => ({
  useMissionActions: () => ({ recordAttempt: mocks.recordAttempt }),
}))

vi.mock('@dicomfall/machine/hooks', () => {
  const controls = { readShow: mocks.readShow, run: mocks.run }
  return {
    useMachineControls: () => controls,
    useFileReading: (path: string | null) => {
      mocks.readingOf(path)
      return { phase: path === null ? 'idle' : 'ready', reading: null, bytes: null, errors: [], reload: mocks.reload }
    },
    useCommandFinished: (callback: () => void) => {
      mocks.finished = callback
    },
  }
})

const MISSION: MissionDefinition = {
  ...MISSION_FIXTURE,
  lab: {
    ...MISSION_FIXTURE.lab,
    files: [
      { fixture: 'ct-explicit-le.dcm', to: FILE },
      { fixture: 'ct-implicit-le.dcm', to: '/lab/ct-implicit-le.dcm' },
    ],
  },
  objectives: [
    { id: 'modality', text: 'Give the Modality.', check: { kind: 'answer', file: FILE, element: '(0008,0060)' } },
    { id: 'preamble', text: 'Mark the preamble.', check: { kind: 'selected', file: FILE, region: 'preamble' } },
  ],
}

const resultOf = (verdict: ReturnType<typeof useMissionPlay>['verdict'], id: string) =>
  verdict?.objectives.find((objective) => objective.objectiveId === id)?.result

function mount(phase: MissionLabPhase = 'ready', key = 'm#0') {
  mocks.readShow.mockResolvedValue({ ok: true, value: CT_EXPLICIT_READING })
  return renderHook(({ phase: at, key: run }) => useMissionPlay(MISSION, at, run), { initialProps: { phase, key } })
}

afterEach(() => vi.clearAllMocks())

describe('useMissionPlay', () => {
  it('judges nothing and reads no file until the lab is built', async () => {
    const { result, rerender } = mount('building')
    expect(result.current.verdict).toBeNull()
    expect(mocks.readingOf).toHaveBeenLastCalledWith(null)
    rerender({ phase: 'ready', key: 'm#0' })
    await waitFor(() => expect(result.current.verdict).not.toBeNull())
    expect(result.current.verdict?.passed).toBe(false)
    expect(mocks.readingOf).toHaveBeenLastCalledWith(FILE)
    expect(mocks.readShow).toHaveBeenCalledWith(FILE)
  })

  it("judges an answer at once against go-dicom's value: wrong, then right, case-blind for a CS", async () => {
    const { result } = mount()
    await waitFor(() => expect(result.current.verdict).not.toBeNull())
    act(() => result.current.answer('modality', 'MR'))
    await waitFor(() => expect(resultOf(result.current.verdict, 'modality')?.failure).toBe('wrong_value'))
    act(() => result.current.answer('modality', 'ct'))
    await waitFor(() => expect(resultOf(result.current.verdict, 'modality')?.passed).toBe(true))
    expect(result.current.actions.answers).toEqual({ modality: 'ct' })
  })

  it('records the attempt once, the first time every objective is met, and keeps a met one met', async () => {
    const { result } = mount()
    await waitFor(() => expect(result.current.verdict).not.toBeNull())
    act(() => result.current.answer('modality', 'CT'))
    act(() => result.current.mark({ from: 0, to: 128 }))
    await waitFor(() => expect(result.current.verdict?.passed).toBe(true))
    expect(result.current.actions.selection).toEqual({ file: FILE, from: 0, to: 128 })
    expect(mocks.recordAttempt).toHaveBeenCalledOnce()
    act(() => result.current.mark({ from: 5, to: 9 }))
    act(() => result.current.mark(null))
    await waitFor(() => expect(result.current.actions.selection).toBeNull())
    await act(async () => {})
    expect(result.current.verdict?.passed).toBe(true)
    expect(mocks.recordAttempt).toHaveBeenCalledOnce()
  })

  it('starts a new play-through with nothing met, marked or given', async () => {
    const { result, rerender } = mount()
    await waitFor(() => expect(result.current.verdict).not.toBeNull())
    act(() => result.current.answer('modality', 'CT'))
    await waitFor(() => expect(resultOf(result.current.verdict, 'modality')?.passed).toBe(true))
    rerender({ phase: 'ready', key: 'm#1' })
    expect(result.current.actions.answers).toEqual({})
    await waitFor(() => expect(result.current.verdict).not.toBeNull())
    expect(resultOf(result.current.verdict, 'modality')?.passed).toBe(false)
  })

  it('reads the lab again after a finished command, and the file the inspector shows', async () => {
    const { result } = mount()
    await waitFor(() => expect(result.current.verdict).not.toBeNull())
    const reads = mocks.readShow.mock.calls.length
    act(() => mocks.finished?.())
    expect(mocks.reload).toHaveBeenCalledOnce()
    await waitFor(() => expect(mocks.readShow.mock.calls.length).toBeGreaterThan(reads))
  })

  it("lists the lab's files and opens the one the first objective is about, with a picker for the rest", () => {
    const { result } = mount()
    expect(result.current.files).toEqual([FILE, '/lab/ct-implicit-le.dcm'])
    expect(result.current.file).toBe(FILE)
    act(() => result.current.selectFile('/lab/ct-implicit-le.dcm'))
    expect(result.current.file).toBe('/lab/ct-implicit-le.dcm')
  })
})
