import type { JourneyNeed, JourneySkill, StopState } from './journey'

/** Everything the side panel says about the selected stop, in Kernelfall's order where it has the row. */
export interface MapDetail {
  /** "Stage 1 · The First File · Open the file · 1.1". */
  readonly place: string
  readonly title: string
  readonly state: StopState
  /** Drawn as not built yet: the stop of a stage with no missions. */
  readonly planned: boolean
  /** "Available, you are here"; empty when no stop is selected. */
  readonly status: string
  /** A mission's objective in one sentence, or what a planned stage covers; null when no stop is selected. */
  readonly about: { readonly term: string; readonly text: string } | null
  /** The skills the mission earns, by title and id. */
  readonly skills: readonly JourneySkill[]
  /** The skills it needs, each met or not; null for a stop that is not a mission. */
  readonly needs: readonly JourneyNeed[] | null
  /** "About 15 min"; null for a stop that is not a mission. */
  readonly time: string | null
  /** "None yet", "3 judged attempts"; null for a stop that is not a mission. */
  readonly attempts: string | null
  /** "None", "2 hints"; null for a stop that is not a mission. */
  readonly hints: string | null
  /** The parts of the standard the stop's stage works with. */
  readonly parts: readonly string[]
  /** The Codex cards the mission adds, each a link to its page in the Codex. */
  readonly codex: readonly { readonly id: string; readonly term: string; readonly href: string }[]
  /** `null` while locked or not built. */
  readonly play: { readonly label: string; readonly href: string } | null
  /** Why the stop can't be played, in plain words; null when it can. */
  readonly note: string | null
}
