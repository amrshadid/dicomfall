import type { ChapterId } from '@dicomfall/game/types'
import type { Tone } from './journey'

export interface GaugeStage {
  readonly id: ChapterId
  /** What its missions' numbers start with: `1`, or `B` for the Bridge. */
  readonly prefix: string
  readonly name: string
  /** "1/1"; "planned" for a stage without missions. */
  readonly count: string
  /** "Stage 1, The First File, 0 of 6 passed". */
  readonly label: string
  readonly tone: Tone
  /** Fractions of the gauge's height. */
  readonly start: number
  readonly size: number
}

/** The map scroller's offset and height, in px. */
export interface ScrollFrame {
  readonly top: number
  readonly view: number
}

/** A stage's place in the drawing, top to bottom, in px. */
export interface StageSpan {
  readonly id: ChapterId
  readonly top: number
  readonly bottom: number
}

/** One stage's share of the gauge, as fractions of its height. */
export interface GaugeSegment {
  readonly id: ChapterId
  readonly start: number
  readonly size: number
}
