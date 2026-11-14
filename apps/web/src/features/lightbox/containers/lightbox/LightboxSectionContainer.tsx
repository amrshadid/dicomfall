import { LightboxSectionPresentation } from '@features/lightbox/components/lightbox'
import type { LightboxSectionId } from '@features/lightbox/types'

export interface LightboxSectionContainerProps {
  section: LightboxSectionId
}

/** Reads nothing yet: no section has data from the Machine to show until go-dicom can give it. */
export function LightboxSectionContainer({ section }: LightboxSectionContainerProps) {
  return <LightboxSectionPresentation section={section} />
}
