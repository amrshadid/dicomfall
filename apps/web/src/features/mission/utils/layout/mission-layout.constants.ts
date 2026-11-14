import type { VmPhase } from '@dicomfall/machine/types'
import type { MissionStepId } from '@features/mission/types'
import type { RailStep } from '@shared/types'

/** The mission's story, in order, as the step rail shows it (Kernelfall's loop, its Card read as the debrief). */
export const MISSION_STEPS: readonly (RailStep & { readonly id: MissionStepId })[] = [
  { id: 'scene', label: 'Scene' },
  { id: 'see', label: 'See it' },
  { id: 'build', label: 'Build it' },
  { id: 'watch', label: 'Watch it' },
  { id: 'debrief', label: 'Debrief' },
]

/** The status bar's word on the Machine. */
export const MACHINE_STATUS: Readonly<Record<VmPhase, string>> = {
  off: 'The Machine: off',
  loading: 'The Machine: loading',
  booting: 'Linux: booting',
  restoring: 'Lab: restoring',
  'setting-up': 'Lab: building',
  ready: 'The Machine: running',
  failed: 'The Machine: failed',
}

/** The ids the layout gives its panels: what shortcuts focus and the tour points at. */
export const MISSION_PANEL_IDS = {
  guide: 'mission-guide',
  bench: 'mission-bench',
  console: 'mission-console',
  inspector: 'mission-inspector',
  lightbox: 'mission-lightbox',
  preview: 'mission-preview',
  uids: 'mission-uids',
  timeline: 'mission-timeline',
} as const

/** How far one arrow key moves a divider: a rem for the side panels, five percent for the split. */
export const WIDTH_STEP_REM = 1
export const SPLIT_STEP_PERCENT = 5
