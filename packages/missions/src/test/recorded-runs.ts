import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { ReadingTable, RecordedRun } from '#utils/run/recorded-run.util'

const RUNS_DIR = join(dirname(fileURLToPath(import.meta.url)), 'runs')
const READINGS_FILE = 'readings.json'

/** Every mission with recorded golden runs. */
export function recordedMissions(): string[] {
  return existsSync(RUNS_DIR)
    ? readdirSync(RUNS_DIR, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
        .sort()
    : []
}

/** Every recorded run of a mission, by file name, and go-dicom's readings they point at. */
export function recordedRuns(mission: string): { runs: RecordedRun[]; table: ReadingTable } {
  const dir = join(RUNS_DIR, mission)
  if (!existsSync(dir)) {
    return { runs: [], table: {} }
  }
  const runs = readdirSync(dir)
    .filter((name) => name.endsWith('.json') && name !== READINGS_FILE)
    .sort()
    .map((name) => JSON.parse(readFileSync(join(dir, name), 'utf8')) as RecordedRun)
  const tablePath = join(dir, READINGS_FILE)
  const table = existsSync(tablePath) ? (JSON.parse(readFileSync(tablePath, 'utf8')) as ReadingTable) : {}
  return { runs, table }
}
