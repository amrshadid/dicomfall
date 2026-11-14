// @vitest-environment jsdom
import { cleanup, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createMissionActions } from '#hooks/mission/useMissionActions.hook'
import { useMissionCompleted } from '#hooks/notifications/useMissionCompleted.hook'
import { createSaveActions } from '#hooks/saves/useSaveActions.hook'
import { EXAMPLE_MISSION, failedVerdict, installTestGame, passedVerdict, uninstallTestGame } from '#test/index'

describe('useMissionCompleted', () => {
  afterEach(() => {
    cleanup()
    uninstallTestGame()
  })

  it('hears a mission passed the first time, and not the attempts before or after', async () => {
    const { clock } = installTestGame()
    await createSaveActions().open()
    const mission = createMissionActions()
    await mission.start(EXAMPLE_MISSION.id)
    const handler = vi.fn()
    renderHook(() => useMissionCompleted(handler))

    await mission.recordAttempt(failedVerdict(EXAMPLE_MISSION))
    expect(handler).not.toHaveBeenCalled()
    await mission.recordAttempt(passedVerdict(EXAMPLE_MISSION))
    await mission.recordAttempt(passedVerdict(EXAMPLE_MISSION))

    expect(handler).toHaveBeenCalledExactlyOnceWith({
      missionId: EXAMPLE_MISSION.id,
      attempts: 2,
      hintsUsed: 0,
      at: clock.now(),
    })
  })
})
