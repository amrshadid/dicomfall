import type { VmPhase } from '@dicomfall/machine/types'

/** Why the Machine can't take a command yet: the console waits for `ready`. */
export interface MachineLock {
  readonly phase: Exclude<VmPhase, 'ready'>
  /** e.g. "Booting Linux". */
  readonly title: string
  /** The status's own words, or a line about the phase. */
  readonly detail: string | null
  readonly failed: boolean
  /** Keys typed now wait in the Machine for the shell it is about to start, and reach it in order. */
  readonly holdsKeys: boolean
}
