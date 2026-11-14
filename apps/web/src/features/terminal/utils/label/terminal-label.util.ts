export interface TerminalLabelInput {
  /** The AE the console is in; null for the Machine's own shell. */
  readonly ae: string | null
  /** The AE the mission puts the console in once its lab is built; null for none. */
  readonly firstAe: string | null
  /** The lab is built, so the console is being moved into `firstAe`. */
  readonly aesBuilt: boolean
}

/**
 * What the Console's header names. Between the lab being built and the shell arriving in the
 * mission's first AE (a second or more), it says where the console is going: nothing is asked of
 * the player there.
 */
export function terminalLabelOf({ ae, firstAe, aesBuilt }: TerminalLabelInput): string {
  if (ae !== null) {
    return `AE ${ae}`
  }
  if (aesBuilt && firstAe !== null) {
    return `going into AE ${firstAe}…`
  }
  return 'the Machine: the lab is not built yet'
}
