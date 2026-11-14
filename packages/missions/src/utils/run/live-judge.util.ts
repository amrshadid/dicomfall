import type {
  FileRead,
  LabPath,
  LabReadings,
  MissionDefinition,
  MissionVerdict,
  PlayerActions,
} from '@dicomfall/game/types'
import { judgeMission, mergeVerdicts, readingRequestOf } from '@dicomfall/game/utils'
import { type LabReader, readLab, readStart } from '#utils/run/lab-readings.util'

/** Runs live judging when asked, one at a time, after things have been quiet for a moment. */
export interface LiveJudge {
  /**
   * Asks for a judging `delayMs` from now; a later request moves it later. A request while one
   * runs gives one more run after it, never two at once.
   */
  readonly request: (delayMs: number) => void
  /** Forgets what was asked and not started yet. One that already runs finishes. */
  readonly cancel: () => void
}

/**
 * Commands typed quickly each ask for a judging: they collapse into one read of the Machine once
 * the typing pauses, and a read is never started while another is still running.
 */
export function createLiveJudge(run: () => Promise<void>): LiveJudge {
  let timer: ReturnType<typeof setTimeout> | null = null
  let running = false
  let again = false
  const start = async () => {
    timer = null
    if (running) {
      again = true
      return
    }
    running = true
    try {
      await run()
    } finally {
      running = false
      if (again) {
        again = false
        void start()
      }
    }
  }
  return {
    request: (delayMs) => {
      if (timer !== null) {
        clearTimeout(timer)
      }
      timer = setTimeout(() => void start(), delayMs)
    },
    cancel: () => {
      if (timer !== null) {
        clearTimeout(timer)
        timer = null
      }
      again = false
    },
  }
}

/** One play-through's judging: the lab as it started, the readings so far, the verdict so far. */
export interface MissionJudge {
  /** Reads the start files once the lab is built, before the player can move them. */
  readonly start: () => Promise<void>
  /**
   * Judges the player's actions now and merges the verdict into the last, so a met objective stays
   * met. `reread` reads the lab again first: after a finished command, which may have changed its
   * files. A selection or an answer changes no file, and judges against the last readings.
   */
  readonly judge: (actions: PlayerActions, reread: boolean) => Promise<MissionVerdict>
  /** The verdict so far; null before the first judging. */
  readonly verdict: () => MissionVerdict | null
  /** The readings the last judging used, for the record. */
  readonly readings: () => LabReadings | null
  /** Start over: no objective met, nothing read. */
  readonly reset: () => void
}

/**
 * The live judging of one mission against go-dicom's readings of the lab, as the File inspector
 * and the golden runs both use it. UI-free: the app calls `judge` after each finished command and
 * each selection or answer, and shows the verdict.
 */
export function createMissionJudge(mission: Pick<MissionDefinition, 'objectives'>, reader: LabReader): MissionJudge {
  const request = readingRequestOf(mission)
  let start: Readonly<Record<LabPath, FileRead>> = {}
  let readings: LabReadings | null = null
  let verdict: MissionVerdict | null = null
  return {
    start: async () => {
      start = await readStart(reader, request)
    },
    judge: async (actions, reread) => {
      if (reread || readings === null) {
        readings = await readLab(reader, request, start)
      }
      verdict = mergeVerdicts(verdict, judgeMission(mission, actions, readings))
      return verdict
    },
    verdict: () => verdict,
    readings: () => readings,
    reset: () => {
      start = {}
      readings = null
      verdict = null
    },
  }
}
