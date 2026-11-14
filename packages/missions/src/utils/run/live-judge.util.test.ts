import type { Validated } from '@dicomfall/core/types'
import type { MissionDefinition } from '@dicomfall/game/types'
import type { ShowReading } from '@dicomfall/machine/types'
import { parseShowJson } from '@dicomfall/machine/utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { recordedRuns } from '#test/recorded-runs'
import { listFilesLine, readLab } from '#utils/run/lab-readings.util'
import { createLiveJudge, createMissionJudge } from '#utils/run/live-judge.util'

const FILE = '/lab/ct-explicit-le.dcm'
// go-dicom's reading of the file as vm:golden took it on the Machine for the first mission.
const recorded = Object.values(recordedRuns('what-the-file-says').table)[0]
const reading = parseShowJson(JSON.stringify(recorded))

const MISSION: Pick<MissionDefinition, 'objectives'> = {
  objectives: [
    { id: 'preamble', text: 'Mark the preamble.', check: { kind: 'selected', file: FILE, region: 'preamble' } },
    { id: 'prefix', text: 'Mark the prefix.', check: { kind: 'selected', file: FILE, region: 'prefix' } },
  ],
}

function fakeReader(files: Record<string, Validated<ShowReading>>, listing: Record<string, string> = {}) {
  const reads: string[] = []
  return {
    reads,
    reader: {
      readShow: async (path: string) => {
        reads.push(path)
        return files[path] ?? { ok: false as const, errors: [`${path}: Error: show: file not found: ${path}`] }
      },
      run: async (line: string) => ({ status: 0, output: listing[line] ?? '' }),
    },
  }
}

describe('a mission judged live', () => {
  it('keeps each objective met as the player marks one range then the next', async () => {
    const { reader, reads } = fakeReader({ [FILE]: reading })
    const judge = createMissionJudge(MISSION, reader)
    await judge.start()
    expect((await judge.judge({ selection: null, answers: {}, predictions: {} }, true)).passed).toBe(false)
    await judge.judge({ selection: { file: FILE, from: 0, to: 128 }, answers: {}, predictions: {} }, false)
    const verdict = await judge.judge(
      { selection: { file: FILE, from: 128, to: 132 }, answers: {}, predictions: {} },
      false
    )
    expect(verdict.passed).toBe(true)
    // A selection changes no file: only the first judging read it.
    expect(reads).toEqual([FILE])
    judge.reset()
    expect(judge.verdict()).toBeNull()
  })

  it('says why when go-dicom could not read the file', async () => {
    const judge = createMissionJudge(MISSION, fakeReader({}).reader)
    const verdict = await judge.judge(
      { selection: { file: FILE, from: 0, to: 128 }, answers: {}, predictions: {} },
      true
    )
    expect(verdict.objectives[0]?.result.failure).toBe('unreadable')
  })

  it('lists a folder and reads every file under it', async () => {
    const { reader, reads } = fakeReader(
      { '/lab/sorted/a/f01.dcm': reading },
      { [listFilesLine('/lab/sorted')]: '/lab/sorted/a/f01.dcm\r\n/lab/sorted/b/notes.txt\n' }
    )
    const readings = await readLab(reader, { files: [], folders: ['/lab/sorted'], startFiles: [] }, {})
    expect(readings.folders).toEqual({ '/lab/sorted': ['/lab/sorted/a/f01.dcm', '/lab/sorted/b/notes.txt'] })
    expect(reads).toEqual(['/lab/sorted/a/f01.dcm', '/lab/sorted/b/notes.txt'])
    expect(readings.files['/lab/sorted/b/notes.txt']?.ok).toBe(false)
  })
})

describe('the live judge', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('collapses quick requests into one run, and never runs two at once', async () => {
    let runs = 0
    let release: () => void = () => {}
    const judge = createLiveJudge(
      () =>
        new Promise<void>((done) => {
          runs++
          release = done
        })
    )
    judge.request(100)
    judge.request(100)
    await vi.advanceTimersByTimeAsync(100)
    expect(runs).toBe(1)
    judge.request(0)
    await vi.advanceTimersByTimeAsync(10)
    expect(runs).toBe(1)
    release()
    await vi.advanceTimersByTimeAsync(0)
    expect(runs).toBe(2)
    judge.cancel()
  })
})
