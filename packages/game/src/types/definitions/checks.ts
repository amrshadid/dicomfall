import type { ObjectiveId } from '#types/definitions/mission'

/** Checks that read the lab's disk as root, through go-dicom. `selected` also has a wire form, read from the event log. */
export const FILE_CHECK_KINDS = ['selected', 'answer', 'offset', 'grouped', 'file', 'absent'] as const

/** Checks that read the event stream and the servers' state. */
export const WIRE_CHECK_KINDS = ['association', 'rejected-context', 'status', 'received', 'subops', 'echo'] as const

export const CHECK_KINDS = [...FILE_CHECK_KINDS, ...WIRE_CHECK_KINDS] as const

export type CheckKind = (typeof CHECK_KINDS)[number]

export type FileCheckKind = (typeof FILE_CHECK_KINDS)[number]

export type WireCheckKind = (typeof WIRE_CHECK_KINDS)[number]

/** The four regions of a Part 10 file, in the order they sit on disk (PS3.10 §7). */
export const PART10_REGIONS = ['preamble', 'prefix', 'file-meta-information', 'data-set'] as const

export type Part10Region = (typeof PART10_REGIONS)[number]

/** The parts of an element a `selected` check can narrow to, in the order they sit in its bytes (PS3.5 §7.1). */
export const ELEMENT_PARTS = ['tag', 'vr', 'length', 'value'] as const

export type ElementPart = (typeof ELEMENT_PARTS)[number]

/** The DIMSE messages, as the Wire inspector labels them (PS3.7 §9 and §10). */
export const DIMSE_MESSAGES = [
  'C-STORE-RQ',
  'C-STORE-RSP',
  'C-FIND-RQ',
  'C-FIND-RSP',
  'C-GET-RQ',
  'C-GET-RSP',
  'C-MOVE-RQ',
  'C-MOVE-RSP',
  'C-ECHO-RQ',
  'C-ECHO-RSP',
  'C-CANCEL-RQ',
  'N-EVENT-REPORT-RQ',
  'N-EVENT-REPORT-RSP',
  'N-GET-RQ',
  'N-GET-RSP',
  'N-SET-RQ',
  'N-SET-RSP',
  'N-ACTION-RQ',
  'N-ACTION-RSP',
  'N-CREATE-RQ',
  'N-CREATE-RSP',
  'N-DELETE-RQ',
  'N-DELETE-RSP',
] as const

export type DimseMessage = (typeof DIMSE_MESSAGES)[number]

/** The two halves of a DIMSE message: its Command Set and its Data Set (PS3.7 §6.3). */
export const MESSAGE_SETS = ['command', 'data'] as const

export type MessageSet = (typeof MESSAGE_SETS)[number]

/** How a `grouped` check wants files sorted: a folder per study, or per study then per series. */
export const GROUPINGS = ['study', 'series'] as const

export type Grouping = (typeof GROUPINGS)[number]

/** Why a presentation context was refused, as the A-ASSOCIATE-AC's Result/Reason gives it (PS3.8 §9.3.3.2). */
export const CONTEXT_REJECTIONS = [
  'user-rejection',
  'no-reason',
  'abstract-syntax-not-supported',
  'transfer-syntaxes-not-supported',
] as const

export type ContextRejection = (typeof CONTEXT_REJECTIONS)[number]

/** The retrieves that run C-STORE sub-operations. */
export const SUBOP_OPERATIONS = ['C-GET', 'C-MOVE'] as const

export type SubopOperation = (typeof SUBOP_OPERATIONS)[number]

/** The largest DIMSE status: a 16-bit value (PS3.7 Annex C). */
export const MAX_STATUS = 0xffff

/** An element's tag as go-dicom prints it: `(0002,0010)`. */
export type Tag = string

/**
 * An element, or an element inside a sequence: the sequence's tag, the item's index from 0 in
 * brackets, then the element's tag, `(0008,1032)[0](0008,0100)`, nested as deep as the file is.
 * Where a check takes an item, a path ending in `[i]` means the item itself.
 */
export type ElementPath = string

/** A UID as PS3.5 §9 writes it: `1.2.840.10008.1.2.1`. */
export type Uid = string

/** An absolute path on the lab's disk, always under `/lab/`: `/lab/ct.dcm`. */
export type LabPath = string

/** "The same value as that element of that file", in place of a UID copied into the spec. */
export interface SameAsValue {
  readonly sameAs: { readonly file: LabPath; readonly element: ElementPath }
}

/** An attribute a `file` check expects: its value as go-dicom prints it, or another file's. */
export type AttributeValue = string | SameAsValue

/**
 * A mission's declared `check:` block. Every kind reads outcomes: the files on the lab's disk, or
 * what crossed the wire. None of them can see which command was typed.
 */
export type CheckDefinition = FileCheckDefinition | WireCheckDefinition

/**
 * The player marked in the File inspector the bytes of one element (or item) or one Part 10
 * region; exactly one is given. `part` narrows an element to its tag, VR, length or value.
 */
export interface FileSelectedCheck {
  readonly kind: 'selected'
  readonly file: LabPath
  readonly element?: ElementPath
  readonly region?: Part10Region
  readonly part?: ElementPart
}

/** The player marked in the Wire inspector the bytes of one element of a DIMSE message in the event log. */
export interface WireSelectedCheck {
  readonly kind: 'selected'
  readonly message: DimseMessage
  readonly set: MessageSet
  readonly element: ElementPath
  readonly part?: ElementPart
}

export type FileCheckDefinition =
  | FileSelectedCheck
  | WireSelectedCheck
  /** A value the player gave or picked matches go-dicom's decoded value of the element. */
  | { readonly kind: 'answer'; readonly file: LabPath; readonly element: ElementPath }
  /** The player's predicted start of the element or item, in bytes from the start of the file. */
  | { readonly kind: 'offset'; readonly file: LabPath; readonly element: ElementPath; readonly offset: number }
  /**
   * Every one of `files`, found by its SOP Instance UID, sits under `into` in a folder of its own
   * study (`by: study`), or in a study folder then a series folder (`by: series`).
   */
  | { readonly kind: 'grouped'; readonly files: readonly LabPath[]; readonly into: LabPath; readonly by: Grouping }
  /**
   * A file decodes to these attributes, as go-dicom prints their values, and to this transfer
   * syntax. At least one of the two is given.
   */
  | {
      readonly kind: 'file'
      readonly file: LabPath
      readonly transferSyntax?: Uid
      readonly attributes?: Readonly<Record<Tag, AttributeValue>>
    }
  /** The file no longer holds the element, as after de-identification. */
  | { readonly kind: 'absent'; readonly file: LabPath; readonly element: ElementPath }

export type WireCheckDefinition =
  /** An association was accepted with this abstract syntax and transfer syntax. */
  | { readonly kind: 'association'; readonly abstractSyntax: Uid; readonly transferSyntax: Uid }
  /** A presentation context for this abstract syntax was refused, for this reason. */
  | { readonly kind: 'rejected-context'; readonly abstractSyntax: Uid; readonly result: ContextRejection }
  /** A DIMSE response carried this status, such as `0x0000`, `0xA801` or `0xC000`. */
  | { readonly kind: 'status'; readonly status: number }
  /** The AE's store holds this SOP Instance UID. */
  | { readonly kind: 'received'; readonly ae: string; readonly sopInstanceUid: Uid }
  /** A C-GET or C-MOVE completed this many sub-operations, with none failed. */
  | { readonly kind: 'subops'; readonly operation: SubopOperation; readonly completed: number }
  /** The AE `to` answers C-ECHO from the AE `from`. */
  | { readonly kind: 'echo'; readonly from: string; readonly to: string }

/** How one objective was judged. */
export interface ObjectiveVerdict {
  readonly objectiveId: ObjectiveId
  readonly kind: CheckKind
  readonly passed: boolean
}

/** A mission's objectives judged together: passed only when every objective's check did. */
export interface MissionVerdict {
  readonly passed: boolean
  /** In the mission's order. */
  readonly objectives: readonly ObjectiveVerdict[]
}
