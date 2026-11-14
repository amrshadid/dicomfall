import type { ElementPart } from '@dicomfall/game/types'
import type { ShowRegionName } from '@dicomfall/machine/types'

/** Sixteen bytes to a line, as `hexdump -C` prints them, so the two can be read side by side. */
export const BYTES_PER_LINE = 16

/** The game's names for go-dicom's regions (docs/MISSIONS.md, `selected`). */
export const REGION_LABELS: Readonly<Record<ShowRegionName, string>> = {
  preamble: 'Preamble',
  prefix: 'DICM prefix',
  fileMeta: 'File Meta Information',
  dataSet: 'Data Set',
}

/** Each part's name on its button and in the legend; its underline style is in FileInspector.css. */
export const PART_LABELS: Readonly<Record<ElementPart, string>> = {
  tag: 'Tag',
  vr: 'VR',
  length: 'Length',
  value: 'Value',
}

/** How each part is underlined, in words, for the legend read by a screen reader. */
export const PART_LINES: Readonly<Record<ElementPart, string>> = {
  tag: 'solid line',
  vr: 'double line',
  length: 'dashed line',
  value: 'dotted line',
}
