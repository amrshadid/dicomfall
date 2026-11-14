import type { ByteRange, ElementPart } from '@dicomfall/game/types'
import { rangeOf } from '@dicomfall/game/utils'
import type { ShowElement, ShowItem, ShowReading, ShowRegion, ShowRegionName } from '@dicomfall/machine/types'
import type { ElementPartRange, TreeRow } from '@features/inspector/types'
import { REGION_LABELS } from './file-inspector.constants'

const ORDERED_PARTS: readonly ElementPart[] = ['tag', 'vr', 'length', 'value']

const sameRange = (a: ByteRange, b: ByteRange): boolean => a.from === b.from && a.to === b.to

const contains = (range: ByteRange, offset: number): boolean => offset >= range.from && offset < range.to

/** A region's bytes, as go-dicom laid the file out. */
export const regionRangeOf = (region: ShowRegion): ByteRange => ({ from: region.offset, to: region.endOffset })

function walk(
  elements: readonly ShowElement[],
  prefix: string,
  depth: number,
  closed: ReadonlySet<string>,
  rows: TreeRow[]
): void {
  for (const element of elements) {
    const path = `${prefix}${element.tag}`
    const items = element.items ?? []
    const open = !closed.has(path)
    rows.push({
      kind: 'element',
      id: path,
      path,
      depth,
      element,
      range: rangeOf({ kind: 'element', element }) ?? { from: element.tagOffset, to: element.endOffset },
      folds: items.length > 0,
      open,
    })
    if (!open) {
      continue
    }
    items.forEach((item: ShowItem, index) => {
      const itemPath = `${path}[${index}]`
      const itemOpen = !closed.has(itemPath)
      rows.push({
        kind: 'item',
        id: itemPath,
        path: itemPath,
        depth: depth + 1,
        index,
        item,
        range: rangeOf({ kind: 'item', item }) ?? { from: item.tagOffset, to: item.endOffset },
        folds: item.elements.length > 0,
        open: itemOpen,
      })
      if (itemOpen) {
        walk(item.elements, itemPath, depth + 2, closed, rows)
      }
    })
  }
}

/**
 * go-dicom's reading as the tree lists it: each Part 10 region as a row, with the elements of the
 * File Meta Information and of the Data Set under theirs, and each sequence's items under it.
 * Element paths are the checks' own, `(0008,1032)[0](0008,0100)`. A path in `closed` is folded.
 */
export function treeRowsOf(reading: ShowReading, closed: ReadonlySet<string> = new Set()): readonly TreeRow[] {
  const rows: TreeRow[] = []
  for (const region of reading.regions) {
    rows.push({
      kind: 'region',
      id: `region:${region.name}`,
      region: region.name,
      label: REGION_LABELS[region.name],
      range: regionRangeOf(region),
    })
    if (region.name === 'fileMeta') {
      walk(reading.fileMeta, '', 0, closed, rows)
    } else if (region.name === 'dataSet') {
      walk(reading.dataSet, '', 0, closed, rows)
    }
  }
  return rows
}

/**
 * The parts of an element or item the inspector marks apart, each with its bytes, by the engine's
 * own `rangeOf`, so a part marked here is exactly the range a `selected` check compares. A part the
 * row has not (no VR under implicit VR, none on an item) or an empty value is left out.
 */
export function partsOf(row: TreeRow): readonly ElementPartRange[] {
  if (row.kind === 'region') {
    return []
  }
  const target =
    row.kind === 'element'
      ? { kind: 'element' as const, element: row.element }
      : { kind: 'item' as const, item: row.item }
  return ORDERED_PARTS.flatMap((part) => {
    const range = rangeOf(target, part)
    return range === null || range.to <= range.from ? [] : [{ part, range }]
  })
}

/** The row whose bytes are exactly `range`: the row a selection is of, if any. */
export function rowOfRange(rows: readonly TreeRow[], range: ByteRange | null): TreeRow | null {
  if (range === null) {
    return null
  }
  return rows.find((row) => sameRange(row.range, range)) ?? null
}

/**
 * The innermost element or item holding a byte: the one whose parts the hex pane draws while that
 * byte is marked. Null in the preamble and the prefix, which hold no element.
 */
export function elementRowAt(rows: readonly TreeRow[], offset: number): TreeRow | null {
  let found: TreeRow | null = null
  for (const row of rows) {
    if (row.kind !== 'region' && contains(row.range, offset) && (found === null || row.depth >= found.depth)) {
      found = row
    }
  }
  return found
}

/** The region a byte is in. */
export function regionAt(regions: readonly ShowRegion[], offset: number): ShowRegionName | null {
  return regions.find((region) => offset >= region.offset && offset < region.endOffset)?.name ?? null
}

/** A tag as `go-dicom show` prints it in its text form, the form the stories use: `0008,0060`. */
export const tagText = (tag: string): string => tag.replace(/^\(/, '').replace(/\)$/, '')

/** The value a row shows: go-dicom's decoded one, else what it holds. */
export function valueText(row: TreeRow): string {
  if (row.kind === 'region') {
    return ''
  }
  if (row.kind === 'item') {
    const count = row.item.elements.length
    return `${count} element${count === 1 ? '' : 's'}`
  }
  const { element } = row
  if (element.value !== undefined) {
    return element.value
  }
  const items = element.items?.length
  if (items !== undefined) {
    return `${items} item${items === 1 ? '' : 's'}`
  }
  return `<${element.valueLength} bytes>`
}
