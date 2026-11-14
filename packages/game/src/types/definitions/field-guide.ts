import type { MissionId } from '#types/definitions/mission'

/** What a command is: one of go-dicom's, or a plain tool of the AE's Linux shell such as `xxd`. */
export const FIELD_GUIDE_KINDS = ['go-dicom', 'shell'] as const

export type FieldGuideKind = (typeof FIELD_GUIDE_KINDS)[number]

/** One row of the Field Guide, the Codex page of commands. */
export interface FieldGuideEntry {
  /** As the player types it: `go-dicom show`, `xxd`. */
  readonly name: string
  readonly kind: FieldGuideKind
  /** One line: what it does. */
  readonly what: string
  /** The mission where the player first meets it: the entry appears when that mission starts. */
  readonly firstMet: MissionId
  /** The missions that use it again or teach what is underneath. */
  readonly deepenedIn: readonly MissionId[]
}

/** `field-guide.yaml`: its entries in the order the page lists them. */
export interface FieldGuide {
  readonly entries: readonly FieldGuideEntry[]
}

/** The page as the player has it now. */
export interface FieldGuideView {
  /** False until the mission of its first entry has been started. */
  readonly open: boolean
  /** The entries met so far, in the guide's order. */
  readonly entries: readonly FieldGuideEntry[]
}
