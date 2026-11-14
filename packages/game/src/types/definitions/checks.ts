import type { ObjectiveId } from '#types/definitions/mission'

/** Checks that read the lab's disk as root, through go-dicom. */
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

/** A UID as PS3.5 §9 writes it: `1.2.840.10008.1.2.1`. */
export type Uid = string

/** An absolute path on the lab's disk: `/lab/ct.dcm`. */
export type LabPath = string

/**
 * A mission's declared `check:` block. Every kind reads outcomes: the files on the lab's disk, or
 * what crossed the wire. None of them can see which command was typed.
 */
export type CheckDefinition = FileCheckDefinition | WireCheckDefinition

export type FileCheckDefinition =
  /** The player marked in the inspector the bytes of one element or one Part 10 region; exactly one is given. */
  | {
      readonly kind: 'selected'
      readonly file: LabPath
      readonly element?: Tag
      readonly region?: Part10Region
    }
  /** A value the player gave or picked matches go-dicom's decoded value of the element. */
  | { readonly kind: 'answer'; readonly file: LabPath; readonly element: Tag }
  /** The player's predicted start of the element, in bytes from the start of the file. */
  | { readonly kind: 'offset'; readonly file: LabPath; readonly element: Tag; readonly offset: number }
  /** The files are sorted into the studies and series their own UIDs put them in. */
  | { readonly kind: 'grouped'; readonly files: readonly LabPath[] }
  /**
   * A file the player wrote or edited decodes to these attributes, as go-dicom prints their values,
   * and to this transfer syntax. At least one of the two is given.
   */
  | {
      readonly kind: 'file'
      readonly file: LabPath
      readonly transferSyntax?: Uid
      readonly attributes?: Readonly<Record<Tag, string>>
    }
  /** The file no longer holds the element, as after de-identification. */
  | { readonly kind: 'absent'; readonly file: LabPath; readonly element: Tag }

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
