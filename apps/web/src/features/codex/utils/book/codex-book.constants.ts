/**
 * The go-dicom release the Machine's image pins (packages/machine's vm-image.lock.json), so a
 * card's paths show the code the player runs, never a moving branch. Moves with the lock.
 */
export const GO_DICOM_RELEASE = 'v1.9.0'

/** go-dicom's source tree at that release, so a card's paths show code that does not change under it. */
export const GO_DICOM_SOURCE_BASE = `https://github.com/amrshadid/go-dicom/blob/${GO_DICOM_RELEASE}/`

/** How the Field Guide says what a command is. */
export const FIELD_GUIDE_WHERE: Readonly<Record<'go-dicom' | 'shell', string>> = {
  'go-dicom': 'go-dicom',
  shell: 'Linux shell',
}
