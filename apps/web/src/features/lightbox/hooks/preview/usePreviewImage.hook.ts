import { useMachineControls } from '@dicomfall/machine/hooks'
import type { PreviewPhase } from '@features/lightbox/types'
import { PREVIEW_PNG, renderLine } from '@features/lightbox/utils/reading'
import { useEffect, useState } from 'react'

export interface UsePreviewImageResult {
  readonly phase: Exclude<PreviewPhase, 'no-pixels'>
  readonly url: string | null
  readonly errors: readonly string[]
}

const IDLE: UsePreviewImageResult = { phase: 'idle', url: null, errors: [] }

/**
 * go-dicom's own rendering of a file: `go-dicom convert … --format png` run as root on the Machine,
 * its PNG read back with root's file read and shown from memory. No decoder of the game's. `key`
 * names the file's bytes: a new key renders again, and null renders nothing.
 */
export function usePreviewImage(path: string | null, key: string | null): UsePreviewImageResult {
  const { run, readFile } = useMachineControls()
  const [state, setState] = useState<UsePreviewImageResult>(IDLE)

  useEffect(() => {
    // key only asks for a new rendering.
    void key
    if (path === null || key === null) {
      setState(IDLE)
      return
    }
    let current = true
    setState((previous) => ({ ...previous, phase: 'rendering', errors: [] }))
    void (async () => {
      const reply = await run(renderLine(path))
      if (!current) {
        return
      }
      if (reply === null || reply.status !== 0) {
        const why =
          reply === null ? 'The Machine is not running.' : reply.output.trim() || `go-dicom exited with ${reply.status}`
        setState({ phase: 'failed', url: null, errors: [why] })
        return
      }
      const png = await readFile(PREVIEW_PNG)
      if (!current) {
        return
      }
      if (!png.ok) {
        setState({ phase: 'failed', url: null, errors: png.errors })
        return
      }
      setState({
        phase: 'ready',
        url: URL.createObjectURL(new Blob([new Uint8Array(png.value)], { type: 'image/png' })),
        errors: [],
      })
    })()
    return () => {
      current = false
    }
  }, [path, key, run, readFile])

  // Each rendering replaces the last: its image is let go of.
  const { url } = state
  useEffect(
    () => () => {
      if (url !== null) {
        URL.revokeObjectURL(url)
      }
    },
    [url]
  )

  return state
}
