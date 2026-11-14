import type { VmPhase } from '@dicomfall/machine/types'

export const MACHINE_LOCK_TEXT: Readonly<
  Record<Exclude<VmPhase, 'ready'>, { readonly title: string; readonly detail: string }>
> = {
  off: { title: 'Starting the Machine', detail: 'Waking the emulator.' },
  loading: {
    title: 'Loading the Machine',
    detail: 'Fetching the emulator and Linux. The first visit downloads the most.',
  },
  booting: { title: 'Booting Linux', detail: 'The kernel is starting; the AEs come up after it.' },
  restoring: { title: 'Restoring the Machine', detail: 'Going back to the lab as the mission found it.' },
  'setting-up': {
    title: 'Building the lab',
    detail: 'Creating the AEs and their links, and copying the fixtures into /lab/.',
  },
  failed: { title: 'The Machine could not start', detail: 'Reload the page to try again.' },
}

export const HOLDS_KEYS = 'What you type now reaches the shell as soon as it opens.'

/** The status bar's words, in the mission status bar's "Lab: building" form, for a lab not yet there to use. */
export const LAB_STATUS_TEXT = {
  building: 'Lab: building',
} as const
