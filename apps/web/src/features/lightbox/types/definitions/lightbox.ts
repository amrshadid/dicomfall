/** The Lightbox's sections, top to bottom: the image, the instance's identity, the run's events. */
export type LightboxSectionId = 'preview' | 'uids' | 'timeline'

export interface LightboxSectionText {
  readonly title: string
  /** A quiet note beside the title: what the section is about. */
  readonly aside: string
  /** What the section says until it has something real to show. */
  readonly waiting: string
}

export interface LightboxSectionPresentationProps {
  section: LightboxSectionId
}

/** One element the Lightbox shows: its name, its tag, and go-dicom's value; null when the file has none. */
export interface LightboxFact {
  readonly tag: string
  readonly label: string
  readonly value: string | null
}

/** Where the image is: waiting for the lab, read, rendered by go-dicom, or why not. */
export type PreviewPhase = 'idle' | 'rendering' | 'ready' | 'failed' | 'no-pixels'

export interface LightboxImagePresentationProps {
  /** The file the image is of; null before the lab is built. */
  file: string | null
  phase: PreviewPhase
  /** The PNG go-dicom wrote, as an address the page can show. */
  url: string | null
  /** go-dicom's own words when it could not render. */
  errors: readonly string[]
  facts: readonly LightboxFact[]
}

export interface UidTrailPresentationProps {
  file: string | null
  /** Study, Series and SOP Instance UID, as the file on disk holds them; null before it is read. */
  uids: readonly LightboxFact[] | null
}
