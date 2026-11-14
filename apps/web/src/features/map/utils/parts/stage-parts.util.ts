import type { ChapterId } from '@dicomfall/game/types'
import { PARTS_LABEL, STAGE_PARTS } from './stage-parts.constants'

/** The stage's parts of the standard; none for a chapter the table doesn't list. */
export function partsOf(id: ChapterId): readonly string[] {
  return STAGE_PARTS[id] ?? []
}

/** "Standard parts: PS3.10, PS3.5"; null with nothing to list. */
export function partsLine(parts: readonly string[]): string | null {
  return parts.length === 0 ? null : `${PARTS_LABEL}: ${parts.join(', ')}`
}
