import type { CodexCardData } from '@shared/types'

/** The stage this mission finished, with what the player can now do: Kernelfall's region block. */
export interface DebriefStage {
  /** "Stage 1 · The First File", or "Bridge · On disk and on the wire". */
  readonly name: string
  readonly outcomes: readonly string[]
}

export interface DebriefPresentationProps {
  /** The debrief's first sentence, as Kernelfall's card opens with it. Text may set terms in `code`. */
  headline: string
  /** The result in one line, e.g. "Mission complete · 2 of 2 objectives met". */
  result: string
  /** The terms this mission taught, as the player met them. */
  learned: readonly string[]
  /** The Codex cards this mission filed, printed whole as Kernelfall's card prints them. */
  cards: readonly CodexCardData[]
  /** "The Four Regions": the mission the cards were filed in, for their stamp. */
  seenIn: string
  /** Set on the mission that finished its stage; null on the others. */
  stage: DebriefStage | null
  /** The mission after this one; null when there is none yet. */
  next: { readonly label: string; onSelect(): void } | null
  onReplay: () => void
  mapHref: string
  /** Called as Back to the map is followed: the debrief is closed, as Kernelfall files its card. */
  onMap: () => void
}
