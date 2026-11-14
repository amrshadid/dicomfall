import { useCallback, useEffect, useState } from 'react'
import { readVmFile, readVmShow } from '#services/vm/vm-connection.service'
import type { ShowReading } from '#types/definitions/show'

export type FileReadingPhase = 'idle' | 'loading' | 'ready' | 'failed'

export interface UseFileReadingResult {
  readonly phase: FileReadingPhase
  /** go-dicom's reading of the file: every element with its byte range. */
  readonly reading: ShowReading | null
  /** The file's bytes as root read them, for the hex pane; the same file the reading is of. */
  readonly bytes: Uint8Array | null
  /** Why the file could not be read or go-dicom refused it, in go-dicom's own words. */
  readonly errors: readonly string[]
  /** Reads the file again: after a command that may have changed it. */
  readonly reload: () => void
}

interface Loaded {
  readonly path: string | null
  readonly phase: FileReadingPhase
  readonly reading: ShowReading | null
  readonly bytes: Uint8Array | null
  readonly errors: readonly string[]
}

const IDLE: Loaded = { path: null, phase: 'idle', reading: null, bytes: null, errors: [] }

/**
 * A file for the File inspector: go-dicom's decoded tree beside the raw bytes, both read as root
 * from the Machine, so the tree and the hex pane always show the same file. `null` reads nothing.
 * `ae` names the namespace to read in; left out, a file in `/lab/<ae>/received/` is read in that AE.
 */
export function useFileReading(path: string | null, ae?: string | null): UseFileReadingResult {
  const [loaded, setLoaded] = useState<Loaded>(IDLE)
  const [round, setRound] = useState(0)

  useEffect(() => {
    // round only asks for a new read.
    void round
    if (path === null) {
      setLoaded(IDLE)
      return
    }
    let current = true
    setLoaded((previous) => ({ ...previous, path, phase: 'loading' }))
    void Promise.all([readVmShow(path, ae), readVmFile(path)]).then(([reading, bytes]) => {
      // A read for a path the inspector has already left is stale.
      if (!current) {
        return
      }
      const errors = [...(reading.ok ? [] : reading.errors), ...(bytes.ok ? [] : bytes.errors)]
      setLoaded({
        path,
        phase: errors.length === 0 ? 'ready' : 'failed',
        reading: reading.ok ? reading.value : null,
        bytes: bytes.ok ? bytes.value : null,
        errors,
      })
    })
    return () => {
      current = false
    }
  }, [path, ae, round])

  const reload = useCallback(() => setRound((value) => value + 1), [])
  const waiting: Loaded = { ...IDLE, phase: path === null ? 'idle' : 'loading' }
  const shown = loaded.path === path ? loaded : waiting
  return { phase: shown.phase, reading: shown.reading, bytes: shown.bytes, errors: shown.errors, reload }
}
