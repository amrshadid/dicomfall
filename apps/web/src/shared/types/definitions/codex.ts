/** A card of the same `deepens` chain, linked both ways; a card not found yet shows only its mission number. */
export interface CodexCardLink {
  readonly term: string | null
  readonly href: string | null
  /** `1.2` or `B.1`. */
  readonly missionNumber: string
}

/** A Codex card as it is read: the term, in plain words, then go-dicom's and the standard's side of it. */
export interface CodexCardData {
  readonly id: string
  readonly term: string
  /** Plain words, 25 at most. */
  readonly simple: string
  /** go-dicom's and the standard's side: sections, functions, files; null for a card without one. */
  readonly deep: string | null
  /** Each path in go-dicom's source tree with its link to the pinned release on GitHub. */
  readonly sources: readonly { readonly path: string; readonly href: string }[]
  /** A link to the standard's section, such as PS3.5 §7.1. */
  readonly docs: string | null
  /** A go-dicom command to try on the player's own machine. */
  readonly tryIt: string | null
  /** The earlier card this one adds to. */
  readonly deepens: CodexCardLink | null
  /** The later cards that add to this one, in play order. */
  readonly deepenedBy: readonly CodexCardLink[]
  /** "1.3 The Transfer Syntax": the mission that files it. */
  readonly filedIn: string
}
