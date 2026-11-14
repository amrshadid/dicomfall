import type { ByteRange } from '@dicomfall/game/types'
import type { FileInspectorProps, TreeRow } from '@features/inspector/types'
import {
  elementRowAt,
  PART_LABELS,
  PART_LINES,
  partsOf,
  rowOfRange,
  tagText,
  treeRowsOf,
} from '@features/inspector/utils/file'
import { FILE_READING } from '@features/inspector/utils/tabs'
import { Button, Segmented } from '@shared/components/ui'
import { useMemo, useState } from 'react'
import { FileTree } from './FileTree'
import { HexPane } from './HexPane'
import './FileInspector.css'

const sameRange = (a: ByteRange | null, b: ByteRange): boolean => a !== null && a.from === b.from && a.to === b.to

const markedWords = (range: ByteRange): string =>
  `bytes ${range.from} to ${range.to - 1} (${range.to - range.from} byte${range.to - range.from === 1 ? '' : 's'})`

const fileName = (path: string): string => path.slice(path.lastIndexOf('/') + 1)

const rowName = (row: TreeRow): string =>
  row.kind === 'region'
    ? row.label
    : row.kind === 'item'
      ? `item ${row.index}`
      : `${tagText(row.element.tag)} ${row.element.name}`

/**
 * The File inspector: go-dicom's element tree beside the file's bytes. Selecting a row, a band or a
 * part marks its bytes on both sides; dragging over the bytes marks a range and finds its row. The
 * marked range is what a `selected` objective reads, and the bar says it in offsets.
 */
export function FileInspector({
  files,
  file,
  onSelectFile,
  phase,
  errors,
  reading,
  bytes,
  marked,
  markedElsewhere,
  onMark,
}: FileInspectorProps) {
  const [closed, setClosed] = useState<ReadonlySet<string>>(new Set())
  // A mark made on one side brings the other side to it; each mark gets a new token.
  const [revealTree, setRevealTree] = useState(0)
  const [revealHex, setRevealHex] = useState(0)
  const [cursor, setCursor] = useState<number | null>(null)

  const allRows = useMemo(() => (reading ? treeRowsOf(reading) : []), [reading])
  const rows = useMemo(() => (reading ? treeRowsOf(reading, closed) : []), [reading, closed])
  const markedRow = rowOfRange(allRows, marked)
  const focusRow =
    markedRow !== null && markedRow.kind !== 'region'
      ? markedRow
      : marked === null
        ? null
        : elementRowAt(allRows, marked.from)
  const parts = focusRow === null ? [] : partsOf(focusRow)

  const markFromTree = (range: ByteRange) => {
    onMark(range)
    setRevealHex((token) => token + 1)
  }
  const markFromHex = (range: ByteRange) => {
    onMark(range)
    setRevealTree((token) => token + 1)
  }
  const toggle = (row: TreeRow) =>
    setClosed((previous) => {
      const next = new Set(previous)
      if (next.has(row.id)) {
        next.delete(row.id)
      } else {
        next.add(row.id)
      }
      return next
    })

  const picker =
    files.length > 1 && file !== null ? (
      <Segmented
        legend="File"
        options={files.map((path) => ({ value: path, label: fileName(path) }))}
        value={file}
        onChange={onSelectFile}
      />
    ) : null

  const ready = reading !== null && bytes !== null
  return (
    <div className="file-inspector">
      <div className="file-inspector__bar">
        {picker}
        {picker === null && file !== null && <code className="file-inspector__file">{file}</code>}
        <p className="file-inspector__marked" aria-live="polite">
          {marked !== null ? (
            <>
              <span className="file-inspector__marked-word">Marked</span> {markedWords(marked)}
              {markedRow !== null && <>: {rowName(markedRow)}</>}
            </>
          ) : markedElsewhere !== null ? (
            <>
              <span className="file-inspector__marked-word">Marked</span> in {markedElsewhere}
            </>
          ) : (
            'Nothing marked. Select a row or a band, or drag over the bytes.'
          )}
        </p>
        {cursor !== null && (
          <p className="file-inspector__cursor">
            byte {cursor} · 0x{cursor.toString(16)}
          </p>
        )}
        {(marked !== null || markedElsewhere !== null) && (
          <Button size="sm" variant="quiet" onClick={() => onMark(null)}>
            Clear
          </Button>
        )}
      </div>

      {!ready && phase === 'failed' && (
        <div className="file-inspector__notice" role="alert">
          <p>go-dicom could not read this file.</p>
          {errors.map((error) => (
            <p key={error} className="file-inspector__error">
              {error}
            </p>
          ))}
        </div>
      )}
      {!ready && phase !== 'failed' && file !== null && (
        <p className="file-inspector__notice" role="status">
          {FILE_READING(file)}
        </p>
      )}

      {ready && (
        <>
          <div className="file-inspector__panes">
            <FileTree
              rows={rows}
              markedId={markedRow?.id ?? null}
              focusId={focusRow?.id ?? null}
              revealToken={revealTree}
              onPick={(row) => markFromTree(row.range)}
              onToggle={toggle}
            />
            <HexPane
              bytes={bytes}
              regions={reading.regions}
              marked={marked}
              parts={parts}
              revealToken={revealHex}
              onMark={markFromHex}
              onCursor={setCursor}
            />
          </div>
          <div className="file-inspector__parts">
            {focusRow === null ? (
              <p className="file-inspector__parts-none">
                Mark an element to see its tag, VR, length and value apart, each underlined its own way.
              </p>
            ) : (
              <>
                <span className="file-inspector__parts-of">Parts of {rowName(focusRow)}</span>
                {/* biome-ignore lint/a11y/useSemanticElements: a row of toggle buttons, not a form field */}
                <span className="file-inspector__part-list" role="group" aria-label={`Parts of ${rowName(focusRow)}`}>
                  {parts.map(({ part, range }) => (
                    <button
                      key={part}
                      type="button"
                      className={`file-inspector__part file-inspector__part--${part}`}
                      aria-pressed={sameRange(marked, range)}
                      aria-label={`${PART_LABELS[part]}, ${PART_LINES[part]}, bytes ${range.from} to ${range.to - 1}`}
                      onClick={() => markFromTree(range)}
                    >
                      <span className="file-inspector__part-name">{PART_LABELS[part]}</span>
                      <span className="file-inspector__part-span">
                        {range.from}–{range.to - 1}
                      </span>
                    </button>
                  ))}
                </span>
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}
