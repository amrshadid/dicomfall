import type { ShowElement, ShowReading } from '@dicomfall/machine/types'
import { VM_GO_DICOM } from '@dicomfall/machine/types'
import { shellQuote } from '@dicomfall/machine/utils'
import type { LightboxFact } from '@features/lightbox/types'
import { PIXEL_DATA, PIXEL_FACTS, PREVIEW_PNG, UID_TRAIL } from './lightbox-reading.constants'

const topLevel = (reading: ShowReading, tag: string): ShowElement | undefined =>
  reading.dataSet.find((element) => element.tag.toUpperCase() === tag)

const factsOf = (reading: ShowReading, wanted: readonly { readonly tag: string; readonly label: string }[]) =>
  wanted.map(({ tag, label }): LightboxFact => ({ tag, label, value: topLevel(reading, tag)?.value ?? null }))

/** Rows, Columns, Bits Allocated and Photometric Interpretation, as go-dicom read them. */
export const pixelFactsOf = (reading: ShowReading): readonly LightboxFact[] => factsOf(reading, PIXEL_FACTS)

/** Study ▸ Series ▸ SOP Instance: the instance's identity as the file on disk holds it. */
export const uidTrailOf = (reading: ShowReading): readonly LightboxFact[] => factsOf(reading, UID_TRAIL)

/** The file holds Pixel Data: there is an image for go-dicom to render. */
export const hasPixelData = (reading: ShowReading): boolean => topLevel(reading, PIXEL_DATA) !== undefined

/**
 * Root's line that renders the instance with go-dicom's own `convert`, as a viewer shows it
 * (rescaled, windowed, 8 bits), into a PNG under /tmp, apart from the lab and the player's files.
 */
export const renderLine = (path: string): string =>
  `rm -f ${PREVIEW_PNG} && ${VM_GO_DICOM} convert ${shellQuote(path)} ${PREVIEW_PNG} --format png`

/**
 * A short fingerprint of a file's bytes (FNV-1a and the length): the image is rendered again only
 * when the file really changed, not after every command that left it alone.
 */
export function fingerprintOf(bytes: Uint8Array): string {
  let hash = 0x811c9dc5
  for (const byte of bytes) {
    hash ^= byte
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return `${bytes.length}:${hash.toString(16)}`
}
