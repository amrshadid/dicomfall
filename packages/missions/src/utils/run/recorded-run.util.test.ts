import type { FileReading, LabReadings } from '@dicomfall/game/types'
import { describe, expect, it } from 'vitest'
import { recordedRuns } from '#test/recorded-runs'
import { readingKey, recordReadings, replayReadings } from '#utils/run/recorded-run.util'

// go-dicom's reading of /lab/ct-explicit-le.dcm as vm:golden took it on the Machine.
const reading = Object.values(recordedRuns('what-the-file-says').table)[0] as FileReading

describe('readings as a recorded run keeps them', () => {
  it('keys a reading by its content: the same reading, the same key', () => {
    expect(readingKey(reading)).toMatch(/^[0-9a-f]{16}$/)
    expect(readingKey(structuredClone(reading))).toBe(readingKey(reading))
    expect(readingKey({ ...reading, size: reading.size + 1 })).not.toBe(readingKey(reading))
  })

  it('keeps each reading once, and gives the same readings back', () => {
    const readings: LabReadings = {
      files: {
        '/lab/ct-explicit-le.dcm': { ok: true, reading },
        '/lab/gone.dcm': { ok: false, error: '/lab/gone.dcm: Error: show: file not found: /lab/gone.dcm' },
      },
      folders: { '/lab/sorted': [] },
      start: { '/lab/ct-explicit-le.dcm': { ok: true, reading } },
    }
    const table: Record<string, FileReading> = {}
    const recorded = recordReadings(readings, table)
    expect(Object.keys(table)).toEqual([readingKey(reading)])
    expect(replayReadings(recorded, table)).toEqual(readings)
    expect(replayReadings(recorded, {}).files['/lab/ct-explicit-le.dcm']).toEqual({
      ok: false,
      error: `no reading ${readingKey(reading)} recorded`,
    })
  })
})
