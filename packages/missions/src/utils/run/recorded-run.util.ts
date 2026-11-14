import {
  type FileRead,
  type FileReading,
  type LabPath,
  type LabReadings,
  type MissionDefinition,
  type MissionVerdict,
  NO_PLAYER_ACTIONS,
  type ObjectiveId,
  type PlayerActions,
} from '@dicomfall/game/types'
import { judgeMission, mergeVerdicts } from '@dicomfall/game/utils'
import type { GoldenChange } from '#utils/run/golden-run.util'

/** A file read in a recorded step: the key of go-dicom's reading in the mission's table, or go-dicom's error. */
export type RecordedRead = { readonly reading: string } | { readonly error: string }

export interface RecordedReadings {
  readonly files: Readonly<Record<LabPath, RecordedRead>>
  readonly folders: Readonly<Record<LabPath, readonly LabPath[]>>
  readonly start: Readonly<Record<LabPath, RecordedRead>>
}

/** One judging of a run: after the lab settled (no change yet), then after each change. */
export interface RecordedStep {
  /** The change just made; null for the lab as it started. */
  readonly change: GoldenChange | null
  readonly actions: PlayerActions
  readonly readings: RecordedReadings
}

/** One golden run as `vm:golden` played it on the real image. */
export interface RecordedRun {
  readonly mission: string
  /** The mission's version when it was recorded: an older one has to be recorded again. */
  readonly version: number
  readonly run: string
  /** What the mission's solution.yaml says the verdict must be. */
  readonly passes: boolean
  /** The image and the go-dicom release the readings came from. */
  readonly image: string
  readonly goDicom: string
  readonly steps: readonly RecordedStep[]
  /** Each objective, met or not, at the end of the run. */
  readonly objectives: Readonly<Record<ObjectiveId, boolean>>
}

/** go-dicom's readings of a mission's files across its runs, by key: each reading once, however many steps read it. */
export type ReadingTable = Readonly<Record<string, FileReading>>

/** A short key for a reading, the same for the same content in any run: FNV-1a over its JSON, twice. */
export function readingKey(reading: FileReading): string {
  const text = JSON.stringify(reading)
  let first = 0x811c9dc5
  let second = 0x01000193
  for (let at = 0; at < text.length; at++) {
    const code = text.charCodeAt(at)
    first = Math.imul(first ^ code, 0x01000193) >>> 0
    second = Math.imul(second ^ code, 0x811c9dc5) >>> 0
  }
  return `${first.toString(16).padStart(8, '0')}${second.toString(16).padStart(8, '0')}`
}

/** Readings as a recorded step keeps them, each reading added to `table` under its key. */
export function recordReadings(readings: LabReadings, table: Record<string, FileReading>): RecordedReadings {
  const record = (reads: Readonly<Record<LabPath, FileRead>>): Record<LabPath, RecordedRead> =>
    Object.fromEntries(
      Object.entries(reads).map(([path, read]) => {
        if (!read.ok) {
          return [path, { error: read.error }]
        }
        const key = readingKey(read.reading)
        table[key] = read.reading
        return [path, { reading: key }]
      })
    )
  return { files: record(readings.files), folders: readings.folders, start: record(readings.start) }
}

/** The readings a recorded step judged against, from the mission's table. */
export function replayReadings(recorded: RecordedReadings, table: ReadingTable): LabReadings {
  const replay = (reads: Readonly<Record<LabPath, RecordedRead>>): Record<LabPath, FileRead> =>
    Object.fromEntries(
      Object.entries(reads).map(([path, read]): [LabPath, FileRead] => {
        if ('error' in read) {
          return [path, { ok: false, error: read.error }]
        }
        const reading = table[read.reading]
        return [
          path,
          reading === undefined ? { ok: false, error: `no reading ${read.reading} recorded` } : { ok: true, reading },
        ]
      })
    )
  return { files: replay(recorded.files), folders: recorded.folders, start: replay(recorded.start) }
}

/** A run judged again from its recorded steps, as live play judged it: each step merged into the last. */
export function rejudgeRun(
  mission: Pick<MissionDefinition, 'objectives'>,
  run: RecordedRun,
  table: ReadingTable
): MissionVerdict {
  let verdict: MissionVerdict | null = null
  for (const step of run.steps) {
    verdict = mergeVerdicts(verdict, judgeMission(mission, step.actions, replayReadings(step.readings, table)))
  }
  return verdict ?? judgeMission(mission, NO_PLAYER_ACTIONS)
}

/** Each objective's id with whether the verdict met it. */
export const objectivesMet = (verdict: MissionVerdict): Record<ObjectiveId, boolean> =>
  Object.fromEntries(verdict.objectives.map(({ objectiveId, result }) => [objectiveId, result.passed]))
