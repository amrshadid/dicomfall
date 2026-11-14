import type { MissionId } from '#types/definitions/mission'

/**
 * Where a concept sits in DICOM, in curriculum order: `foundations` for what the standard is
 * for, the file format and how elements are encoded, the information model and its pixels, then
 * associations, DIMSE messages, query and retrieve, and interoperability.
 */
export const CONCEPT_PARTS = [
  'foundations',
  'file-format',
  'encoding',
  'information-model',
  'pixel-data',
  'association',
  'dimse',
  'query-retrieve',
  'interoperability',
] as const

/** A mission teaches at most this many concepts. */
export const CORE_CONCEPT_BUDGET = 3

/**
 * The first stages every later one builds on: a concept they teach or name that no later mission
 * uses again is a break in the chain.
 */
export const FOUNDATION_STAGES = 2

export const CONCEPT_VIOLATION_KINDS = ['used-before-taught', 'taught-twice', 'never-used-again'] as const

export type ConceptId = string
export type ConceptPart = (typeof CONCEPT_PARTS)[number]
export type ConceptViolationKind = (typeof CONCEPT_VIOLATION_KINDS)[number]

/** One entry of `concepts.yaml`. */
export interface Concept {
  readonly id: ConceptId
  /** As the player meets it: "transfer syntax", "presentation context". */
  readonly term: string
  readonly part: ConceptPart
  /** The Codex card that explains it. */
  readonly codex?: string
}

export interface ConceptViolation {
  readonly kind: ConceptViolationKind
  readonly concept: ConceptId
  /** The mission that uses it too early, teaches it again, or taught it with no mission using it after. */
  readonly missionId: MissionId
  /** The mission that teaches it later, or taught it first; null when there is none. */
  readonly other: MissionId | null
}
