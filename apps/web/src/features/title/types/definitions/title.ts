export interface ContinueTarget {
  readonly href: string
  /** "Stage 1 · The first file · The Preamble". */
  readonly where: string
  /** "In progress · last played 2 days ago". */
  readonly step: string
}

/** Where New game starts, for the lines under it on a first visit. */
export interface FirstMission {
  /** "Start at The Preamble." */
  readonly where: string
  /** The mission in one sentence. */
  readonly step: string
}
