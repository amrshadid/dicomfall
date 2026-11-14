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

/** A byte range in a file, `from` inclusive, `to` exclusive, as go-dicom's offsets are. */
export interface ByteRange {
  readonly from: number
  readonly to: number
}

/** A range the player marked in the File inspector, in the file it was marked in. */
export interface ByteSelection extends ByteRange {
  readonly file: LabPath
}

/**
 * What the player has done that a file check reads, as it stands now. Never which command was
 * typed: commands change the lab's files, and the files are read.
 */
export interface PlayerActions {
  /** The range marked in the File inspector now; null when nothing is marked. */
  readonly selection: ByteSelection | null
  /** What each answer box holds now, by objective. */
  readonly answers: Readonly<Record<ObjectiveId, string>>
  /** The offset each `offset` objective's box holds now, by objective. */
  readonly predictions: Readonly<Record<ObjectiveId, number>>
}

export const NO_PLAYER_ACTIONS: PlayerActions = { selection: null, answers: {}, predictions: {} }

/**
 * Where an element's or an item's bytes are, as go-dicom's `show --json` gives them. The game's
 * view of go-dicom's reading: `@dicomfall/machine`'s `ShowReading` has this shape and more, and
 * the checks read nothing else, so no parser of the game's own ever decides a verdict.
 */
export interface ReadingSpan {
  /** `(gggg,eeee)`, upper-case hex; `(FFFE,E000)` for an item. */
  readonly tag: string
  readonly tagOffset: number
  readonly lengthOffset: number
  /** The length field alone, 2 or 4 bytes; a long-form VR's two reserved bytes sit before it. */
  readonly lengthSize: number
  readonly valueOffset: number
  readonly valueLength: number
  readonly undefinedLength: boolean
  readonly endOffset: number
}

export interface ReadingElement extends ReadingSpan {
  readonly vr: string
  /** go-dicom's decoded value, padding trimmed, values joined by `\`; none for a sequence or binary data. */
  readonly value?: string
  /** null when the VR is implicit. */
  readonly vrOffset: number | null
  readonly items?: readonly ReadingItem[]
}

export interface ReadingItem extends ReadingSpan {
  readonly elements: readonly ReadingElement[]
}

/** go-dicom's reading of one file: its Part 10 regions, transfer syntax and elements. */
export interface FileReading {
  readonly size: number
  /** go-dicom's names: `preamble`, `prefix`, `fileMeta`, `dataSet`. */
  readonly regions: readonly { readonly name: string; readonly offset: number; readonly endOffset: number }[]
  readonly transferSyntax: { readonly uid: string }
  readonly fileMeta: readonly ReadingElement[]
  readonly dataSet: readonly ReadingElement[]
}

/** A file go-dicom read, or why it could not: no such file, or not one go-dicom reads. */
export type FileRead =
  | { readonly ok: true; readonly reading: FileReading }
  | { readonly ok: false; readonly error: string }

/** What a mission's file checks need read on the Machine before they can be judged. */
export interface ReadingRequest {
  /** Files to read now. */
  readonly files: readonly LabPath[]
  /** Folders to list now, every regular file under them, at any depth; each listed file is read too. */
  readonly folders: readonly LabPath[]
  /** Files to read once, as the lab starts: a `grouped` check's files, before the player moves them. */
  readonly startFiles: readonly LabPath[]
}

/** go-dicom's readings taken on the Machine, for the checks to judge against. */
export interface LabReadings {
  /** Each file read now, by path; a file left out has not been read. */
  readonly files: Readonly<Record<LabPath, FileRead>>
  /** The regular files under each listed folder now, at any depth, by folder. */
  readonly folders: Readonly<Record<LabPath, readonly LabPath[]>>
  /** The start files, as the lab started. */
  readonly start: Readonly<Record<LabPath, FileRead>>
}

export const NO_READINGS: LabReadings = { files: {}, folders: {}, start: {} }

/** Why a check didn't pass, for the app to put into words. */
export const CHECK_FAILURES = {
  /** The file has not been read from the Machine yet. */
  notRead: 'not_read',
  /** go-dicom could not read the file: it is missing or not DICOM. */
  unreadable: 'unreadable',
  /** The file holds no element at that path (or no such item). */
  noElement: 'no_element',
  /** The element has no such part: no VR under implicit VR, none on an item. */
  noPart: 'no_part',
  /** go-dicom's reading has no such region. */
  noRegion: 'no_region',
  /** Nothing is marked in the File inspector. */
  notMarked: 'not_marked',
  /** The marked range is in another file. */
  wrongFile: 'wrong_file',
  /** The marked range is not exactly the bytes asked for. */
  wrongRange: 'wrong_range',
  /** The answer or offset box is empty. */
  notGiven: 'not_given',
  /** The element has no value go-dicom decodes as text: a sequence, binary data. */
  noValue: 'no_value',
  wrongValue: 'wrong_value',
  wrongOffset: 'wrong_offset',
  /** A `grouped` check: a file of the set is not under the folder. */
  missingFiles: 'missing_files',
  /** A `grouped` check: a file is not at the depth asked for (one folder for study, two for series). */
  wrongDepth: 'wrong_depth',
  /** A `grouped` check: one folder holds files of two studies or two series. */
  mixedFolder: 'mixed_folder',
  /** A `grouped` check: one study or series is split over two folders. */
  splitGroup: 'split_group',
  wrongTransferSyntax: 'wrong_transfer_syntax',
  /** A `file` check: an attribute is missing or holds another value. */
  wrongAttribute: 'wrong_attribute',
  /** An `absent` check: the file still holds the element. */
  stillPresent: 'still_present',
  /** A wire check, or a `selected` in the Wire inspector: judged from go-dicom's event log, not by this engine yet. */
  notEvaluated: 'not_evaluated',
} as const

export type CheckFailure = (typeof CHECK_FAILURES)[keyof typeof CHECK_FAILURES]

/** One file of a `grouped` check as it was found under the folder. */
export interface GroupedFile {
  readonly path: LabPath
  /** Its path under the folder: `a/f01.dcm`. */
  readonly relative: string
  readonly sopInstanceUid: Uid
  readonly studyInstanceUid: Uid
  readonly seriesInstanceUid: Uid
}

/** One attribute a `file` check compared. */
export interface AttributeFinding {
  readonly tag: Tag
  /** The value asked for: as written, or another file's (`sameAs`); null when that one could not be read. */
  readonly expected: string | null
  /** go-dicom's value in the file; null when the file has no such element or no text value. */
  readonly found: string | null
  readonly passed: boolean
}

/** What a check found. `failure` is null exactly when `passed`; the rest is the evidence it read. */
export type CheckResult =
  | {
      readonly kind: 'selected'
      readonly passed: boolean
      readonly failure: CheckFailure | null
      /** The file the check names; null for the Wire inspector's form. */
      readonly file: LabPath | null
      /** The element path or the region asked for. */
      readonly target: string
      readonly part: ElementPart | null
      /** The bytes go-dicom puts there; null when the file or the element could not be found. */
      readonly expected: ByteRange | null
      readonly marked: ByteSelection | null
    }
  | {
      readonly kind: 'answer'
      readonly passed: boolean
      readonly failure: CheckFailure | null
      readonly file: LabPath
      readonly element: ElementPath
      /** The element's VR, which decides how values compare; null when it was not found. */
      readonly vr: string | null
      /** go-dicom's decoded value; null when it has none. */
      readonly expected: string | null
      readonly given: string | null
    }
  | {
      readonly kind: 'offset'
      readonly passed: boolean
      readonly failure: CheckFailure | null
      readonly file: LabPath
      readonly element: ElementPath
      /** Where go-dicom says the element starts: what the prediction is judged against. */
      readonly expected: number | null
      /** The offset the mission's spec copied; a difference from `expected` is the spec's mistake. */
      readonly declared: number
      readonly given: number | null
    }
  | {
      readonly kind: 'grouped'
      readonly passed: boolean
      readonly failure: CheckFailure | null
      readonly into: LabPath
      readonly by: Grouping
      /** Every DICOM file found under the folder. */
      readonly found: readonly GroupedFile[]
      /** The SOP Instance UIDs of the set that are not under the folder. */
      readonly missing: readonly Uid[]
    }
  | {
      readonly kind: 'file'
      readonly passed: boolean
      readonly failure: CheckFailure | null
      readonly file: LabPath
      /** The transfer syntax go-dicom read the file with; null when it could not read it. */
      readonly transferSyntax: Uid | null
      readonly attributes: readonly AttributeFinding[]
    }
  | {
      readonly kind: 'absent'
      readonly passed: boolean
      readonly failure: CheckFailure | null
      readonly file: LabPath
      readonly element: ElementPath
      /** Whether the file still holds it; null when the file could not be read. */
      readonly present: boolean | null
    }
  | {
      readonly kind: WireCheckKind
      readonly passed: false
      readonly failure: typeof CHECK_FAILURES.notEvaluated
    }

/** How one objective was judged, with the evidence. */
export interface ObjectiveVerdict {
  readonly objectiveId: ObjectiveId
  readonly result: CheckResult
}

/** A mission's objectives judged together: passed only when every objective's check did. */
export interface MissionVerdict {
  readonly passed: boolean
  /** In the mission's order. */
  readonly objectives: readonly ObjectiveVerdict[]
}
