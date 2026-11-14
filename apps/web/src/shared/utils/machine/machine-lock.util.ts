import type { VmPhase, VmStatus } from '@dicomfall/machine/types'
import type { MachineLock } from '@shared/types'
import { HOLDS_KEYS, MACHINE_LOCK_TEXT } from './machine-lock.constants'

// The Machine holds the console's keys while it goes back to a saved lab. Not while it builds
// one: keys typed then were seen lost, so the console stays locked rather than promise them.
const HOLDING: readonly VmPhase[] = ['restoring']

/** Null once the shell is at its prompt; `wasReady` is true once the Machine has been ready since the page opened. */
export function machineLockOf({ phase, detail }: VmStatus, wasReady: boolean): MachineLock | null {
  if (phase === 'ready') {
    return null
  }
  const text = MACHINE_LOCK_TEXT[phase]
  const failed = phase === 'failed'
  // Before the first boot is done there is no shell for the keys to wait for.
  const holdsKeys = wasReady && HOLDING.includes(phase)
  return {
    phase,
    title: text.title,
    detail: detail ?? (holdsKeys ? `${text.detail} ${HOLDS_KEYS}` : text.detail),
    failed,
    holdsKeys,
  }
}

/**
 * The lock while a mission's lab is still being built on a Machine that is otherwise ready. The lab
 * the mission starts from is saved once it is built, and Start over goes back to it: a file
 * changed before then would be saved into it.
 */
export const LAB_BUILDING_LOCK: MachineLock = {
  phase: 'setting-up',
  title: MACHINE_LOCK_TEXT['setting-up'].title,
  detail: MACHINE_LOCK_TEXT['setting-up'].detail,
  failed: false,
  holdsKeys: false,
}
