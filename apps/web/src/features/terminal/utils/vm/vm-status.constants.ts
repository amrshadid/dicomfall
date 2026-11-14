import type { VmPhase } from '@dicomfall/machine/types'

/** What the console says while the Machine starts; a ready shell speaks for itself. */
export const VM_STATUS_LINES: Partial<Record<VmPhase, string>> = {
  loading: 'Loading the Machine: the emulator and Linux…',
  booting: 'Booting Linux…',
  'setting-up': 'Building the lab: its AEs, their links and the fixtures in /lab/…',
  failed: 'The Machine could not start:',
}

/** Dim text, then back to normal. */
export const DIM = '\x1b[2m'
export const RESET = '\x1b[0m'
