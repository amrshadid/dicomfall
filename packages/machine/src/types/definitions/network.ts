/** One application entity: a network namespace with its own address, joined to others by links. */
export interface AeDefinition {
  /** The namespace, the hostname and the console's prompt (`workstation:~# `): kebab-case, 16 characters at most. */
  readonly name: string
  /** DICOM's AE title (PS3.5 §6.2, VR AE), sent in the association request: `WORKSTATION`. */
  readonly title: string
  /** The AE's IPv4 address with its prefix length, `10.0.0.1/24`; left out for an AE with no link. */
  readonly address?: string
}

/** A cable between two AEs, by name: a veth pair, one end in each namespace. */
export type LinkDefinition = readonly [string, string]

/** A fixture from `packages/fixtures/out/`, copied into the lab before the mission starts. */
export interface LabFileDefinition {
  /** Its path under FIXTURES_DIR in the image: `ct-explicit-le.dcm`, or `series/` for a folder. */
  readonly fixture: string
  /** Where it lands, always under `/lab/`. */
  readonly to: string
}

export interface NetworkDefinition {
  readonly aes: readonly AeDefinition[]
  readonly links: readonly LinkDefinition[]
  readonly files?: readonly LabFileDefinition[]
}

/**
 * An AE's name is a shell word, a namespace and a hostname. Kebab-case keeps it readable in the
 * prompt; 16 characters keep the prompt short.
 */
export const AE_NAME = /^[a-z](?:[a-z0-9-]{0,14}[a-z0-9])?$/

/**
 * An AE title as PS3.5 §6.2 allows it: 1 to 16 characters of the default repertoire, no
 * backslash, not only spaces. Upper case is the game's convention, not the standard's.
 */
export const AE_TITLE = /^(?! *$)[ -[\]-~]{1,16}$/

export const IPV4 = /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/

export const IPV4_WITH_PREFIX = /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}\/(3[0-2]|[12]?\d)$/

/** Where the image keeps every fixture, outside `/lab`, so the lab holds only what a mission puts there: a mission copies from here. */
export const FIXTURES_DIR = '/usr/share/dicomfall/fixtures'

/** A path the Machine writes into a shell line: plain characters only, never `..`. */
export const LAB_PATH = /^(?!.*\/\.\.(\/|$))\/lab\/[A-Za-z0-9._/-]*$/

/** A fixture's path under the fixtures folder, by the same rule. */
export const FIXTURE_PATH = /^(?!.*(^|\/)\.\.(\/|$))[A-Za-z0-9._-][A-Za-z0-9._/-]*$/

/** The loss a link fault may set, in percent: 100 drops every packet while both ends stay up. */
export const LINK_LOSS_PERCENT = { min: 1, max: 100 } as const
