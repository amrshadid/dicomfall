import type { ByteRange, ElementPart } from '@dicomfall/game/types'
import type { FileReadingPhase } from '@dicomfall/machine/hooks'
import type { ShowElement, ShowItem, ShowReading, ShowRegion, ShowRegionName } from '@dicomfall/machine/types'
import type { ReactNode } from 'react'

/** The Inspector's views: the file as PS3.10 lays it out, and the association as PS3.8 carries it. */
export type InspectorTab = 'file' | 'wire'

export interface InspectorPresentationProps {
  tab: InspectorTab
  onSelectTab: (tab: InspectorTab) => void
  /** Laid over the tab's surface while it has nothing to draw; null once it does. */
  notice: string | null
  /** What the tab draws once it can; left out while it has nothing. */
  children?: ReactNode
}

/**
 * One row of the File inspector's tree: a Part 10 region, an element, or a sequence's item. An
 * element's or item's `path` is the checks' own (`(0008,1032)[0](0008,0100)`).
 */
export type TreeRow =
  | {
      readonly kind: 'region'
      readonly id: string
      readonly region: ShowRegionName
      readonly label: string
      readonly range: ByteRange
    }
  | {
      readonly kind: 'element'
      readonly id: string
      readonly path: string
      readonly depth: number
      readonly element: ShowElement
      readonly range: ByteRange
      /** A sequence with items: it can fold. */
      readonly folds: boolean
      readonly open: boolean
    }
  | {
      readonly kind: 'item'
      readonly id: string
      readonly path: string
      readonly depth: number
      /** From 0, as the path writes it. */
      readonly index: number
      readonly item: ShowItem
      readonly range: ByteRange
      readonly folds: boolean
      readonly open: boolean
    }

/** One part of an element or item and its bytes. */
export interface ElementPartRange {
  readonly part: ElementPart
  readonly range: ByteRange
}

/** A line of the hex pane: a region's band, or sixteen bytes from `start`. */
export type HexLine =
  | { readonly kind: 'band'; readonly region: ShowRegion }
  | { readonly kind: 'bytes'; readonly start: number }

export interface FileInspectorProps {
  /** The lab's files the inspector can open; a picker shows when there are several. */
  files: readonly string[]
  file: string | null
  onSelectFile: (file: string) => void
  phase: FileReadingPhase
  /** Why the file could not be read, in go-dicom's or the Machine's words. */
  errors: readonly string[]
  reading: ShowReading | null
  bytes: Uint8Array | null
  /** The marked range in this file; null when nothing is marked here. */
  marked: ByteRange | null
  /** Where a range marked in another file is, said in the bar; null when there is none. */
  markedElsewhere: string | null
  onMark: (range: ByteRange | null) => void
}
