import type { GuideStatus } from '@features/guide/types'
import type { MissionLabPhase } from '@features/mission/hooks/lab'

/** What the lab is doing, for the line over the actions. Null while it is the player's to use. */
export function labStatusOf(phase: MissionLabPhase, errors: readonly string[]): GuideStatus | null {
  switch (phase) {
    case 'building':
      return {
        text: 'Building the lab… about a minute the first time. Linux boots in your browser, then the AEs and their files are set up.',
        busy: true,
        failed: false,
        details: [],
      }
    case 'restoring':
      return {
        text: 'Putting the lab back as the mission found it.',
        busy: true,
        failed: false,
        details: [],
      }
    case 'failed':
      return {
        text: 'The lab could not be built. Reload the page to try again.',
        busy: false,
        failed: true,
        details: errors,
      }
    case 'ready':
      return null
  }
}

/** Why an action waits, as its button says it; null when the lab is the player's to use. */
export function waitReasonOf(phase: MissionLabPhase): string | null {
  switch (phase) {
    case 'building':
      return 'The lab is still being built.'
    case 'restoring':
      return 'The lab is being put back.'
    case 'failed':
      return 'The lab could not be built.'
    case 'ready':
      return null
  }
}
