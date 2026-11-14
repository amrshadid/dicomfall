import type { InspectorTab } from '@features/inspector/types'

/** The Inspector's tabs, in order: the file on disk, then the messages on the wire. */
export const INSPECTOR_TABS: readonly { readonly id: InspectorTab; readonly label: string }[] = [
  { id: 'file', label: 'File' },
  { id: 'wire', label: 'Wire' },
]

/**
 * What each tab says until it can draw its view. The File tab waits for the lab: go-dicom reads
 * the file on the Machine. The Wire tab needs go-dicom's event log, which no released go-dicom
 * writes yet; nothing is drawn from a guess in the meantime.
 */
export const INSPECTOR_WAITING: Readonly<Record<InspectorTab, string>> = {
  file: "The File inspector opens when the Machine is ready to show it: go-dicom's element tree beside the file's bytes, each element marked on the bytes it came from. Until then, read the file at the Console.",
  wire: 'The Wire inspector opens when the Machine is ready to show it: every message between the AEs, row by row, each field beside its bytes. Until then, follow the association at the Console.',
}

/** The File tab while go-dicom reads the file. */
export const FILE_READING = (file: string): string => `Reading ${file} with go-dicom…`

/** The File tab when the lab has no file to open. */
export const NO_LAB_FILE = 'This lab copies no file to open here. Read the lab at the Console.'
