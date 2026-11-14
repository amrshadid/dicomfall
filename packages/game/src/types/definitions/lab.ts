import type { LabPath } from '#types/definitions/checks'

/** The longest AE title: VR AE holds at most 16 characters (PS3.5 §6.2). */
export const MAX_AE_TITLE = 16

/**
 * An application entity of the lab: a network namespace of the Machine, with its own address and
 * its own go-dicom processes.
 */
export interface LabAe {
  /** The namespace and the console's prompt, kebab-case: `workstation`. */
  readonly name: string
  /** The DICOM AE title sent in the association request: `WORKSTATION`. */
  readonly title: string
  /** Its IPv4 address with prefix length, `10.0.1.1/24`; left out for an AE with no link. */
  readonly address?: string
  /** go-dicom commands the Machine runs in the AE before the mission opens; empty when none. */
  readonly start: readonly string[]
}

/** Two AE names joined by a veth pair. */
export type LabLink = readonly [string, string]

/**
 * A fixture of `packages/fixtures/out/` and where it lands before the mission starts. A folder
 * fixture ends in `/`, and so does its destination.
 */
export interface LabFile {
  readonly fixture: string
  readonly to: LabPath
}

/** What a mission starts from: its AEs, the links between them, the files on the disk, and where the console opens. */
export interface LabDefinition {
  readonly aes: readonly LabAe[]
  /** Empty for a lab of one AE. */
  readonly links: readonly LabLink[]
  readonly files: readonly LabFile[]
  /** The name of the AE the console opens in. */
  readonly console: string
}
