/** Where the preview is rendered on the Machine: outside /lab, so no check and no `ls` ever sees it. */
export const PREVIEW_PNG = '/tmp/df-preview.png'

export const PIXEL_DATA = '(7FE0,0010)'

/** The elements that describe the pixels, shown beside the image (PS3.3 C.7.6.3). */
export const PIXEL_FACTS: readonly { readonly tag: string; readonly label: string }[] = [
  { tag: '(0028,0010)', label: 'Rows' },
  { tag: '(0028,0011)', label: 'Columns' },
  { tag: '(0028,0100)', label: 'Bits Allocated' },
  { tag: '(0028,0004)', label: 'Photometric Interpretation' },
]

/** The instance's identity, from the study down (PS3.3 C.7.2.1, C.7.3.1, C.12.1). */
export const UID_TRAIL: readonly { readonly tag: string; readonly label: string }[] = [
  { tag: '(0020,000D)', label: 'Study Instance UID' },
  { tag: '(0020,000E)', label: 'Series Instance UID' },
  { tag: '(0008,0018)', label: 'SOP Instance UID' },
]
