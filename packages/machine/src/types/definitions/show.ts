/**
 * go-dicom's own reading of a file, as `go-dicom show <file> --json` prints it (go-dicom 1.9.0,
 * schemaVersion 1). Every offset is in bytes from the start of the file, every range ends before
 * its `endOffset`. The game never parses DICOM itself: the File inspector and the file checks
 * read only this.
 */

/** The only schema this game reads; any other is refused rather than misread. */
export const SHOW_SCHEMA_VERSION = 1

/** The Part 10 regions as go-dicom names them, in the order they sit on disk (PS3.10 §7.1). */
export const SHOW_REGION_NAMES = ['preamble', 'prefix', 'fileMeta', 'dataSet'] as const

export type ShowRegionName = (typeof SHOW_REGION_NAMES)[number]

/** What the offsets count from: the file, or the inflated Data Set of a deflated file. */
export const SHOW_OFFSET_BASES = ['file', 'inflatedDataSet'] as const

export type ShowOffsetBase = (typeof SHOW_OFFSET_BASES)[number]

export interface ShowRegion {
  readonly name: ShowRegionName
  readonly offset: number
  readonly endOffset: number
}

/** The transfer syntax go-dicom read the Data Set with. */
export interface ShowTransferSyntax {
  readonly uid: string
  readonly explicitVR: boolean
  readonly littleEndian: boolean
  readonly deflated: boolean
}

/** Where an element's or an item's bytes are: its tag, its length field and its value. */
export interface ShowSpan {
  /** `(gggg,eeee)` in upper-case hex: `(FFFE,E000)` for an item. */
  readonly tag: string
  readonly tagOffset: number
  readonly lengthOffset: number
  /** The length field alone: 2 or 4 bytes. The reserved bytes of a long-form VR sit before it. */
  readonly lengthSize: number
  readonly valueOffset: number
  /** The value's content only; with an undefined length, what go-dicom counted. */
  readonly valueLength: number
  readonly undefinedLength: boolean
  readonly endOffset: number
}

/** One element of the File Meta Information or the Data Set, or one inside an item. */
export interface ShowElement extends ShowSpan {
  readonly keyword: string
  readonly name: string
  /** The VR as written in the file, or the dictionary's for implicit VR (`OB or OW` for Pixel Data). */
  readonly vr: string
  readonly vm: number
  /**
   * The value as `show` prints it, padding trimmed, several values joined by `\`. Left out for a
   * sequence and for a binary VR read with explicit VR; go-dicom 1.9.0 still prints one for Pixel
   * Data read with implicit VR, as text.
   */
  readonly value?: string
  /** Where the two VR letters are; null when the VR is implicit. */
  readonly vrOffset: number | null
  /** A sequence's items, in order. */
  readonly items?: readonly ShowItem[]
  /** An encapsulated Pixel Data's fragments; no fixture has one yet, so they are kept as go-dicom wrote them. */
  readonly fragments?: readonly unknown[]
  /** The sequence delimiter of an undefined-length sequence; no fixture has one yet. */
  readonly delimiter?: unknown
}

/** One item of a sequence: its own tag and length, and the elements inside it. */
export interface ShowItem extends ShowSpan {
  readonly elements: readonly ShowElement[]
  /** The item delimiter of an undefined-length item; no fixture has one yet. */
  readonly delimiter?: unknown
}

/** A whole file as go-dicom read it. */
export interface ShowReading {
  readonly schemaVersion: typeof SHOW_SCHEMA_VERSION
  /** The path go-dicom was given. */
  readonly file: string
  readonly size: number
  /** False for a file with no preamble and no `DICM`. */
  readonly preamble: boolean
  readonly regions: readonly ShowRegion[]
  readonly transferSyntax: ShowTransferSyntax
  readonly offsetsRelativeTo: ShowOffsetBase
  /** Group 0002, (0002,0000) first: unlike the text form of `show`, the JSON includes it. */
  readonly fileMeta: readonly ShowElement[]
  readonly dataSet: readonly ShowElement[]
  readonly warnings: readonly string[]
}
