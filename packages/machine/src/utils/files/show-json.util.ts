import type { Validated } from '@dicomfall/core/types'
import { Issues, ObjectReader } from '@dicomfall/core/utils'
import {
  SHOW_OFFSET_BASES,
  SHOW_REGION_NAMES,
  SHOW_SCHEMA_VERSION,
  type ShowElement,
  type ShowItem,
  type ShowReading,
  type ShowSpan,
} from '#types/definitions/show'
import { VM_GO_DICOM } from '#types/definitions/vm'
import { shellQuote } from '#utils/files/file-read.util'

/** The most nesting a reading may hold: deeper is a broken reply, not a file. */
const MAX_DEPTH = 64

/** Root's line that prints go-dicom's reading of a file, with each element's byte range, as JSON. */
export const showJsonLine = (path: string): string => `${VM_GO_DICOM} show ${shellQuote(path)} --json`

/**
 * The AE whose receive folder holds a path (`/lab/archive/received/x.dcm` is archive's), or null
 * for the shared rest of `/lab`. Every AE sees the same disk; a reading runs in the AE that wrote
 * the file so it reads as that AE would.
 */
export function aeOfLabPath(path: string): string | null {
  return /^\/lab\/([a-z][a-z0-9-]*)\/received\//.exec(path)?.[1] ?? null
}

function readSpan(reader: ObjectReader): ShowSpan {
  return {
    tag: reader.string('tag', { pattern: /^\([0-9A-F]{4},[0-9A-F]{4}\)$/, expected: 'a tag like (0002,0010)' }),
    tagOffset: reader.integer('tagOffset', 0),
    lengthOffset: reader.integer('lengthOffset', 0),
    lengthSize: reader.integer('lengthSize', 2, 4),
    valueOffset: reader.integer('valueOffset', 0),
    // An undefined length is 0xFFFFFFFF on disk; go-dicom may report it as counted or as is.
    valueLength: reader.integer('valueLength', 0),
    undefinedLength: reader.flag('undefinedLength'),
    endOffset: reader.integer('endOffset', 0),
  }
}

function readItem(value: unknown, path: string, issues: Issues, depth: number): ShowItem {
  const reader = new ObjectReader(value, path, issues)
  return {
    ...readSpan(reader),
    elements: reader.list('elements', (element, at) => readElement(element, at, issues, depth + 1)),
    ...(reader.has('delimiter') && { delimiter: reader.value('delimiter') }),
  }
}

function readElement(value: unknown, path: string, issues: Issues, depth: number): ShowElement {
  // reads cli/show.go: the --json element objects (go-dicom #259, PR #262)
  const reader = new ObjectReader(value, path, issues)
  if (depth > MAX_DEPTH) {
    issues.add(path, `nested deeper than ${MAX_DEPTH} sequences`)
  }
  const items = reader.optional('items', (key) =>
    depth > MAX_DEPTH ? [] : reader.list(key, (item, at) => readItem(item, at, issues, depth))
  )
  const fragments = reader.optional('fragments', (key) => reader.list(key, (fragment) => fragment))
  return {
    ...readSpan(reader),
    keyword: reader.text('keyword'),
    name: reader.text('name'),
    vr: reader.string('vr'),
    vm: reader.integer('vm', 0),
    ...(reader.has('value') && { value: reader.text('value') }),
    vrOffset: reader.nullable('vrOffset', (key) => reader.integer(key, 0)),
    ...(items !== undefined && { items }),
    ...(fragments !== undefined && { fragments }),
    ...(reader.has('delimiter') && { delimiter: reader.value('delimiter') }),
  }
}

/**
 * go-dicom's reading of a file from what `go-dicom show <file> --json` printed, checked field by
 * field. A schema other than the one this game was written against is refused with a clear
 * error, never half read; fields a later go-dicom adds within the same schema are ignored.
 */
export function parseShowJson(text: string): Validated<ShowReading> {
  // reads cli/show.go: the --json document (go-dicom #259, PR #262)
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    const start = text.trim().slice(0, 120)
    return { ok: false, errors: [`go-dicom's reply is not JSON: ${start === '' ? '(empty)' : start}`] }
  }
  const issues = new Issues()
  const reader = new ObjectReader(raw, '', issues)
  const version = reader.value('schemaVersion')
  if (version !== SHOW_SCHEMA_VERSION) {
    return {
      ok: false,
      errors: [
        `go-dicom's show --json has schemaVersion ${JSON.stringify(version)}; this game reads schemaVersion ${SHOW_SCHEMA_VERSION} only (the image's go-dicom and the game disagree)`,
      ],
    }
  }
  const syntax = reader.object('transferSyntax')
  const reading: ShowReading = {
    schemaVersion: SHOW_SCHEMA_VERSION,
    file: reader.string('file'),
    size: reader.integer('size', 0),
    preamble: reader.flag('preamble'),
    regions: reader.list('regions', (value, path) => {
      const region = new ObjectReader(value, path, issues)
      return {
        name: region.oneOf('name', SHOW_REGION_NAMES),
        offset: region.integer('offset', 0),
        endOffset: region.integer('endOffset', 0),
      }
    }),
    transferSyntax: {
      // Empty when go-dicom found no File Meta Information and guessed one.
      uid: syntax.text('uid'),
      explicitVR: syntax.flag('explicitVR'),
      littleEndian: syntax.flag('littleEndian'),
      deflated: syntax.flag('deflated'),
    },
    offsetsRelativeTo: reader.oneOf('offsetsRelativeTo', SHOW_OFFSET_BASES),
    fileMeta: reader.list('fileMeta', (value, path) => readElement(value, path, issues, 0)),
    dataSet: reader.list('dataSet', (value, path) => readElement(value, path, issues, 0)),
    warnings: reader.list('warnings', (value) => (typeof value === 'string' ? value : JSON.stringify(value))),
  }
  return issues.result(reading)
}
