import type { ChapterId } from '@dicomfall/game/types'

/** What the pointer or the keyboard is on. */
export type MapNoteTarget =
  | { readonly kind: 'stop'; readonly key: string }
  | { readonly kind: 'region'; readonly key: string }
  | { readonly kind: 'chapter'; readonly id: ChapterId }

/** The note under the drawing: what the thing under the pointer or focus is. */
export interface MapNote {
  /** "1.1 · What the File Says", "Open the file", "What this stage covers · The First File". */
  readonly title: string
  readonly text: string
  /** "Next up", "About 15 min", "Guide: The Preamble". */
  readonly facts: readonly string[]
}

/** Every note the map can show, by stop key, region key and stage. */
export interface MapNotes {
  readonly stops: ReadonlyMap<string, MapNote>
  readonly regions: ReadonlyMap<string, MapNote>
  readonly chapters: ReadonlyMap<ChapterId, MapNote>
}
