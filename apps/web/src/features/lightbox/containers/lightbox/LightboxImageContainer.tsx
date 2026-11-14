import type { UseFileReadingResult } from '@dicomfall/machine/hooks'
import { LightboxImagePresentation } from '@features/lightbox/components/lightbox'
import { usePreviewImage } from '@features/lightbox/hooks/preview'
import { fingerprintOf, hasPixelData, pixelFactsOf } from '@features/lightbox/utils/reading'
import { useMemo } from 'react'

export interface LightboxImageContainerProps {
  /** The lab's file the inspector shows; the image is of the same one. */
  file: string | null
  reading: Pick<UseFileReadingResult, 'phase' | 'reading' | 'bytes'>
}

/**
 * The Lightbox's image: go-dicom renders the file the inspector shows, and renders it again when
 * its bytes change. The pixel elements beside it come from the same `show --json` reading.
 */
export function LightboxImageContainer({ file, reading }: LightboxImageContainerProps) {
  const shown = reading.reading
  const pixels = shown !== null && hasPixelData(shown)
  const key = useMemo(() => (reading.bytes === null ? null : fingerprintOf(reading.bytes)), [reading.bytes])
  const preview = usePreviewImage(pixels ? file : null, pixels ? key : null)
  const phase = shown === null ? 'idle' : pixels ? preview.phase : 'no-pixels'
  return (
    <LightboxImagePresentation
      file={file}
      phase={phase === 'idle' && shown !== null ? 'rendering' : phase}
      url={preview.url}
      errors={preview.errors}
      facts={shown === null ? [] : pixelFactsOf(shown)}
    />
  )
}
