import type { ChapterId } from '@dicomfall/game/types'

/**
 * The parts of the DICOM standard each stage works with, by chapter id, as the regions' sources
 * cite them in chapters.yaml. The game's chapters carry no such list: `standsFor` is a sentence.
 */
export const STAGE_PARTS: Readonly<Record<ChapterId, readonly string[]>> = {
  'the-first-file': ['PS3.10', 'PS3.5'],
  'the-elements': ['PS3.5'],
  'the-object': ['PS3.3', 'PS3.4'],
  'the-bridge': ['PS3.10', 'PS3.7'],
  'the-association': ['PS3.8', 'PS3.7'],
  'query-and-retrieve': ['PS3.4', 'PS3.7'],
  interoperability: ['PS3.2', 'PS3.5', 'PS3.18'],
}

/** Printed before a stage's parts, as Kernelfall prints "Kernel source:" before a layer's files. */
export const PARTS_LABEL = 'Standard parts'
