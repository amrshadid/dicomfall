import type { UseFileReadingResult } from '@dicomfall/machine/hooks'
import { UidTrailPresentation } from '@features/lightbox/components/lightbox'
import { uidTrailOf } from '@features/lightbox/utils/reading'

export interface UidTrailContainerProps {
  file: string | null
  reading: Pick<UseFileReadingResult, 'reading'>
}

/** The UID trail of the file the inspector shows, on disk, from go-dicom's reading of it. */
export function UidTrailContainer({ file, reading }: UidTrailContainerProps) {
  return <UidTrailPresentation file={file} uids={reading.reading === null ? null : uidTrailOf(reading.reading)} />
}
