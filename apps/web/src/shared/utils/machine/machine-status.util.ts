import type { VmPhase } from '@dicomfall/machine/types'
import { LAB_STATUS_TEXT } from './machine-lock.constants'

/**
 * The status bar's word on a mission's lab while the Machine itself is ready, or null when the
 * Machine's own word stands. Linux is up before the lab is: between the boot and the build,
 * "running" would say the AEs are there to use. `lab` is the lab's phase (`building`, `ready`…),
 * null without a mission.
 */
export function labStatusOf(machine: VmPhase, lab: string | null): string | null {
  if (machine !== 'ready') {
    return null
  }
  if (lab === 'building') {
    return LAB_STATUS_TEXT.building
  }
  return null
}
