import { eventBus } from '@dicomfall/core/services'
import type { ServiceResponse } from '@dicomfall/core/types'
import { useMemo } from 'react'
import { getGameConfig, getGameNow } from '#config'
import type { AttemptRecordedPayload, MissionCompletedPayload, MissionStartedPayload } from '#events/types'
import { GAME_EVENTS } from '#events/types'
import { announceProgress } from '#services/utils/announce-progress.service'
import {
  lockedMissionError,
  noActiveMissionError,
  noContentError,
  notCompletedError,
  unknownMissionError,
} from '#services/utils/error-handling.service'
import { useProgressStore } from '#store/progress.store'
import type { MissionVerdict } from '#types/definitions/checks'
import type { MissionId } from '#types/definitions/mission'
import type { ActiveMission } from '#types/definitions/store'
import { hintsUsed } from '#utils/hints/index'
import {
  closeDebrief,
  findMissionProgress,
  isCompleted,
  missionStatus,
  openDebrief,
  openDebriefOf,
  recordAttempt,
  replayMission,
  startMission,
} from '#utils/progress/index'

const SOURCE = 'game/mission'

export interface UseMissionActionsResult {
  /** Opens a mission at its incident. Fails for unknown and locked missions. */
  start: (missionId: MissionId) => Promise<ServiceResponse<ActiveMission>>
  /** Incident read: on to the lab. */
  begin: () => ServiceResponse<ActiveMission>
  /**
   * The active mission again from its incident, as Kernelfall's Replay level: no verdict, every
   * hint to ask for again, no debrief left open. Its completion and attempts are kept.
   */
  replay: () => Promise<ServiceResponse<ActiveMission>>
  /**
   * Keeps a verdict judged elsewhere as one more attempt, and completes the mission the first time
   * one passes. Retries are free.
   */
  recordAttempt: (verdict: MissionVerdict) => Promise<ServiceResponse<MissionVerdict>>
  /**
   * Only once the mission has passed. The debrief stays open in the save, with the verdict, so a
   * reload or a later visit opens the mission at it again, as Kernelfall reopens a level at its card.
   */
  showDebrief: () => Promise<ServiceResponse<ActiveMission>>
  /** The player left the debrief through one of its ways on: the mission no longer opens at it. */
  leaveDebrief: () => Promise<void>
  leave: () => void
}

/** The mission loop's flows. Each one updates the store, emits game events and autosaves. */
export function createMissionActions(): UseMissionActionsResult {
  const store = useProgressStore.getState

  const start = async (missionId: MissionId): Promise<ServiceResponse<ActiveMission>> => {
    const { content } = getGameConfig()
    if (!content) return noContentError()
    const mission = content.mission(missionId)
    if (!mission) return unknownMissionError(missionId)
    if (missionStatus(store().progress, mission, content) === 'locked') return lockedMissionError(missionId)
    const at = getGameNow()
    const resumed = findMissionProgress(store().progress, missionId) !== undefined
    // A debrief left open comes back with the verdict it was shown with, never a fresh lab's.
    const debrief = openDebriefOf(store().progress, missionId)
    const active: ActiveMission = debrief
      ? { mission, phase: 'debrief', verdict: debrief.verdict }
      : { mission, phase: 'incident', verdict: null }
    store().setProgress(startMission(store().progress, missionId, at))
    store().setActive(active)
    eventBus.emit<MissionStartedPayload>(GAME_EVENTS.MISSION_STARTED, { missionId, resumed, at }, { source: SOURCE })
    await announceProgress(SOURCE)
    return { success: true, data: active }
  }

  const moveTo = (phase: ActiveMission['phase']): ServiceResponse<ActiveMission> => {
    const { active } = store()
    if (!active) return noActiveMissionError()
    if (phase === 'debrief' && !isCompleted(store().progress, active.mission.id)) {
      return notCompletedError(active.mission.id)
    }
    const moved = { ...active, phase }
    store().setActive(moved)
    return { success: true, data: moved }
  }

  /** Writes the progress with no debrief open; resolves once saved, at once when none was. */
  const closeOpenDebrief = (): Promise<void> => {
    const { progress } = store()
    if (progress.debrief === undefined) {
      return Promise.resolve()
    }
    store().setProgress(closeDebrief(progress))
    return announceProgress(SOURCE)
  }

  const record = async (verdict: MissionVerdict): Promise<ServiceResponse<MissionVerdict>> => {
    const { active, progress } = store()
    if (!active) return noActiveMissionError()
    const { mission } = active
    const at = getGameNow()
    const recorded = recordAttempt(progress, mission.id, verdict.passed, at)
    if (!recorded) return noActiveMissionError()
    store().setProgress(recorded)
    store().setActive({ ...active, verdict })
    eventBus.emit<AttemptRecordedPayload>(
      GAME_EVENTS.ATTEMPT_RECORDED,
      { missionId: mission.id, passed: verdict.passed, at },
      { source: SOURCE }
    )
    if (verdict.passed && !isCompleted(progress, mission.id)) {
      const saved = findMissionProgress(recorded, mission.id)
      eventBus.emit<MissionCompletedPayload>(
        GAME_EVENTS.MISSION_COMPLETED,
        {
          missionId: mission.id,
          attempts: saved?.attempts ?? 1,
          hintsUsed: hintsUsed(mission, saved?.hintsRevealed ?? 0),
          at,
        },
        { source: SOURCE }
      )
    }
    await announceProgress(SOURCE)
    return { success: true, data: verdict }
  }

  return {
    start,
    // Back into play (Replay from the debrief included): live judging takes over, nothing is left open.
    begin: () => {
      const moved = moveTo('play')
      if (moved.success) {
        void closeOpenDebrief()
      }
      return moved
    },
    replay: async () => {
      const { active } = store()
      if (!active) return noActiveMissionError()
      const { mission } = active
      const replayed: ActiveMission = { mission, phase: 'incident', verdict: null }
      store().setProgress(replayMission(store().progress, mission.id))
      store().setActive(replayed)
      eventBus.emit<MissionStartedPayload>(
        GAME_EVENTS.MISSION_STARTED,
        { missionId: mission.id, resumed: true, at: getGameNow() },
        { source: SOURCE }
      )
      await announceProgress(SOURCE)
      return { success: true, data: replayed }
    },
    recordAttempt: record,
    showDebrief: async () => {
      const moved = moveTo('debrief')
      if (moved.success && moved.data) {
        store().setProgress(openDebrief(store().progress, moved.data.mission.id, moved.data.verdict))
        await announceProgress(SOURCE)
      }
      return moved
    },
    leaveDebrief: closeOpenDebrief,
    leave: () => store().setActive(null),
  }
}

export function useMissionActions(): UseMissionActionsResult {
  return useMemo(createMissionActions, [])
}
