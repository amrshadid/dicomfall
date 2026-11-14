import type { LightboxSectionId, LightboxSectionText } from '@features/lightbox/types'

/**
 * Each section's words. The image and the UID trail are read from the lab's file by go-dicom, so
 * they wait for the lab; the timeline needs go-dicom's event log, which no released go-dicom gives
 * yet. A section that guessed would teach something wrong.
 */
export const LIGHTBOX_SECTIONS: Readonly<Record<LightboxSectionId, LightboxSectionText>> = {
  preview: {
    title: 'Image',
    aside: 'Rows × Columns',
    waiting:
      'The image preview opens when the Machine is ready to show it: the instance as decoded from its bytes, with Rows, Columns, Bits Allocated and Photometric Interpretation beside it.',
  },
  uids: {
    title: 'UID trail',
    aside: 'Study ▸ Series ▸ SOP Instance',
    waiting:
      "The UID trail opens when the Machine is ready to show it: the instance's identity everywhere it appears, on disk and on the wire.",
  },
  timeline: {
    title: 'Timeline',
    aside: 'events in order',
    waiting: "The timeline opens when the Machine is ready to show it: the run's events, in the order they happened.",
  },
}

/** The wire side of the UID trail, until an association carries the instance in a later stage. */
export const UID_WIRE_WAITING =
  'Nothing has crossed the wire yet. When the network stages send this instance to another AE, its UIDs show here as they travel.'
