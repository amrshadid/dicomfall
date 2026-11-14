import type { ByteRange } from '@dicomfall/game/types'
import type { ShowRegion } from '@dicomfall/machine/types'
import type { HexLine } from '@features/inspector/types'
import { BYTES_PER_LINE } from './file-inspector.constants'

/**
 * The hex pane's lines, as hexdump lays bytes out, sixteen to a line, with each Part 10 region's
 * band put before the line it starts in.
 */
export function hexLinesOf(size: number, regions: readonly ShowRegion[]): readonly HexLine[] {
  const lines: HexLine[] = []
  const starts = [...regions].sort((a, b) => a.offset - b.offset)
  let next = 0
  for (let start = 0; start < size; start += BYTES_PER_LINE) {
    while (next < starts.length && (starts[next]?.offset ?? size) < start + BYTES_PER_LINE) {
      const region = starts[next]
      if (region !== undefined) {
        lines.push({ kind: 'band', region })
      }
      next++
    }
    lines.push({ kind: 'bytes', start })
  }
  return lines
}

/** The index of the line that holds a byte. */
export function lineIndexOf(lines: readonly HexLine[], offset: number): number {
  const at = lines.findIndex((line) => line.kind === 'bytes' && offset < line.start + BYTES_PER_LINE)
  return at === -1 ? Math.max(0, lines.length - 1) : at
}

/** An offset as hexdump's first column prints it: eight hex digits. */
export const hexOffset = (offset: number): string => offset.toString(16).padStart(8, '0')

/** A byte as two hex digits, as hexdump prints it. */
export const byteHex = (byte: number): string => byte.toString(16).padStart(2, '0')

/** A byte as hexdump's right-hand column shows it: printable ASCII as itself, the rest as a dot. */
export const byteText = (byte: number): string => (byte >= 0x20 && byte < 0x7f ? String.fromCharCode(byte) : '.')

/** The range from one byte to another, both included, in either order. */
export const spanOf = (a: number, b: number): ByteRange => ({ from: Math.min(a, b), to: Math.max(a, b) + 1 })

export const inRange = (range: ByteRange | null, offset: number): boolean =>
  range !== null && offset >= range.from && offset < range.to
