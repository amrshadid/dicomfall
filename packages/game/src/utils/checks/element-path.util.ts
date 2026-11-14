import type {
  ByteRange,
  ElementPart,
  ElementPath,
  FileReading,
  Part10Region,
  ReadingElement,
  ReadingItem,
  ReadingSpan,
} from '#types/definitions/checks'

/** go-dicom's name for each Part 10 region a mission names (PS3.10 §7.1). */
const REGION_NAMES: Readonly<Record<Part10Region, string>> = {
  preamble: 'preamble',
  prefix: 'prefix',
  'file-meta-information': 'fileMeta',
  'data-set': 'dataSet',
}

/** An item or sequence delimiter: a tag and a zero length, 8 bytes (PS3.5 §7.5). */
const DELIMITER_BYTES = 8

const STEP = /\(([0-9A-Fa-f]{4}),([0-9A-Fa-f]{4})\)|\[(\d+)\]/y

/** One step of a path: an element by tag, or an item by its index from 0. */
type PathStep = { readonly tag: string } | { readonly item: number }

/** The steps of `(0008,1032)[0](0008,0100)`; null for a path that is not one. */
export function parseElementPath(path: ElementPath): readonly PathStep[] | null {
  const steps: PathStep[] = []
  STEP.lastIndex = 0
  while (STEP.lastIndex < path.length) {
    const at = STEP.lastIndex
    const match = STEP.exec(path)
    if (match === null || match.index !== at) {
      return null
    }
    const [, group, element, item] = match
    const previous = steps.at(-1)
    if (item !== undefined) {
      // An item follows the sequence it is in.
      if (previous === undefined || !('tag' in previous)) {
        return null
      }
      steps.push({ item: Number(item) })
    } else {
      if (previous !== undefined && 'tag' in previous) {
        return null
      }
      steps.push({ tag: `(${group?.toUpperCase()},${element?.toUpperCase()})` })
    }
  }
  return steps.length > 0 ? steps : null
}

/** An element, or an item when the path ends in `[i]`. */
export type ReadingTarget =
  | { readonly kind: 'element'; readonly element: ReadingElement }
  | { readonly kind: 'item'; readonly item: ReadingItem }

/**
 * The element or item a path names in go-dicom's reading, through each sequence's items; null when
 * the file holds none. A top-level tag is looked for in the File Meta Information, then the Data Set.
 */
export function findTarget(reading: FileReading, path: ElementPath): ReadingTarget | null {
  const steps = parseElementPath(path)
  if (steps === null) {
    return null
  }
  let elements: readonly ReadingElement[] = [...reading.fileMeta, ...reading.dataSet]
  let target = null as ReadingTarget | null
  for (const step of steps) {
    if ('tag' in step) {
      const element = elements.find((candidate) => candidate.tag.toUpperCase() === step.tag)
      if (element === undefined) {
        return null
      }
      target = { kind: 'element', element }
    } else {
      const item: ReadingItem | undefined = target?.kind === 'element' ? target.element.items?.[step.item] : undefined
      if (item === undefined) {
        return null
      }
      target = { kind: 'item', item }
      elements = item.elements
    }
  }
  return target
}

const spanOf = (target: ReadingTarget): ReadingSpan => (target.kind === 'element' ? target.element : target.item)

/**
 * The bytes of an element or item, or of one part of it, as the inspector draws them: the tag's 4
 * bytes; the VR's 2 letters, and the 2 reserved bytes after them for a long-form VR (PS3.5 §7.1.2);
 * the length field; the value, which for an undefined length stops before its delimiter. null for
 * a part it has not: a VR under implicit VR, or on an item.
 */
export function rangeOf(target: ReadingTarget, part: ElementPart | null = null): ByteRange | null {
  const span = spanOf(target)
  switch (part) {
    case null:
      return { from: span.tagOffset, to: span.endOffset }
    case 'tag':
      return { from: span.tagOffset, to: span.tagOffset + 4 }
    case 'vr':
      return target.kind === 'element' && target.element.vrOffset !== null
        ? { from: target.element.vrOffset, to: span.lengthOffset }
        : null
    case 'length':
      return { from: span.lengthOffset, to: span.lengthOffset + span.lengthSize }
    default:
      return {
        from: span.valueOffset,
        to: span.undefinedLength ? span.endOffset - DELIMITER_BYTES : span.valueOffset + span.valueLength,
      }
  }
}

/** A Part 10 region's bytes, as go-dicom laid the file out; null when the reading has none (no preamble). */
export function regionRange(reading: FileReading, region: Part10Region): ByteRange | null {
  const found = reading.regions.find((candidate) => candidate.name === REGION_NAMES[region])
  return found === undefined ? null : { from: found.offset, to: found.endOffset }
}

/** Where an element or item starts: its tag's first byte. */
export const startOf = (target: ReadingTarget): number => spanOf(target).tagOffset
