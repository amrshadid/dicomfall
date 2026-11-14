import type { TreeRow } from '@features/inspector/types'
import { tagText, valueText } from '@features/inspector/utils/file'
import { type CSSProperties, type KeyboardEvent, useEffect, useRef } from 'react'

export interface FileTreeProps {
  rows: readonly TreeRow[]
  /** The row whose bytes are exactly the marked range. */
  markedId: string | null
  /** The row the hex pane draws the parts of: the innermost element holding the mark. */
  focusId: string | null
  /** Changes each time a mark is made in the hex pane, so the tree brings its row into view. */
  revealToken: number
  onPick: (row: TreeRow) => void
  onToggle: (row: TreeRow) => void
}

const labelOf = (row: TreeRow): string => {
  if (row.kind === 'region') {
    return `${row.label}, bytes ${row.range.from} to ${row.range.to - 1}`
  }
  if (row.kind === 'item') {
    return `Item ${row.index}, bytes ${row.range.from} to ${row.range.to - 1}`
  }
  return `${tagText(row.element.tag)} ${row.element.name}, ${valueText(row)}`
}

/**
 * go-dicom's element tree: each region, each element with its tag, VR, length and value, and each
 * sequence's items, folding. Selecting a row marks its bytes. Up and Down move between rows; Left
 * folds, Right opens.
 */
export function FileTree({ rows, markedId, focusId, revealToken, onPick, onToggle }: FileTreeProps) {
  const list = useRef<HTMLUListElement>(null)

  // A mark made in the hex pane brings its row into view; one made here already is.
  useEffect(() => {
    if (revealToken === 0) {
      return
    }
    const id = markedId ?? focusId
    if (id !== null) {
      const rowElements = [...(list.current?.querySelectorAll<HTMLElement>('[data-row]') ?? [])]
      rowElements.find((element) => element.dataset.row === id)?.scrollIntoView?.({ block: 'nearest' })
    }
  }, [revealToken, markedId, focusId])

  const onKeyDown = (event: KeyboardEvent<HTMLUListElement>) => {
    const buttons = [...(list.current?.querySelectorAll<HTMLButtonElement>('.file-tree__pick') ?? [])]
    const at = buttons.indexOf(document.activeElement as HTMLButtonElement)
    if (at === -1) {
      return
    }
    const row = rows[at]
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      buttons[Math.min(buttons.length - 1, Math.max(0, at + (event.key === 'ArrowDown' ? 1 : -1)))]?.focus()
    } else if (row !== undefined && row.kind !== 'region' && row.folds) {
      if ((event.key === 'ArrowLeft' && row.open) || (event.key === 'ArrowRight' && !row.open)) {
        event.preventDefault()
        onToggle(row)
      }
    }
  }

  return (
    <ul ref={list} className="file-tree" aria-label="Elements, as go-dicom reads them" onKeyDown={onKeyDown}>
      {rows.map((row) => {
        const marked = row.id === markedId
        const focused = row.id === focusId
        const depth = row.kind === 'region' ? 0 : row.depth
        const className = [
          'file-tree__row',
          `file-tree__row--${row.kind}`,
          row.kind === 'region' ? `file-tree__row--${row.region}` : '',
          marked ? 'is-marked' : '',
          focused && !marked ? 'is-focused' : '',
        ]
          .filter(Boolean)
          .join(' ')
        return (
          <li key={row.id} className={className} data-row={row.id} style={{ '--depth': depth } as CSSProperties}>
            {row.kind !== 'region' && row.folds ? (
              <button
                type="button"
                className="file-tree__fold"
                aria-expanded={row.open}
                aria-label={`${row.open ? 'Fold' : 'Open'} ${row.kind === 'item' ? `item ${row.index}` : tagText(row.element.tag)}`}
                tabIndex={-1}
                onClick={() => onToggle(row)}
              >
                {row.open ? '▾' : '▸'}
              </button>
            ) : (
              <span className="file-tree__fold" aria-hidden="true" />
            )}
            <button
              type="button"
              className="file-tree__pick"
              aria-pressed={marked}
              aria-label={labelOf(row)}
              onClick={() => onPick(row)}
            >
              {row.kind === 'region' && (
                <>
                  <span className="file-tree__region">{row.label}</span>
                  <span className="file-tree__span">
                    {row.range.from}–{row.range.to - 1}
                  </span>
                </>
              )}
              {row.kind === 'item' && (
                <>
                  <span className="file-tree__tag">{tagText(row.item.tag)}</span>
                  <span className="file-tree__name">Item {row.index}</span>
                  <span className="file-tree__value">{valueText(row)}</span>
                </>
              )}
              {row.kind === 'element' && (
                <>
                  <span className="file-tree__tag">{tagText(row.element.tag)}</span>
                  <span className="file-tree__vr">{row.element.vr}</span>
                  <span className="file-tree__name">{row.element.name}</span>
                  <span className="file-tree__value">{valueText(row)}</span>
                </>
              )}
            </button>
          </li>
        )
      })}
    </ul>
  )
}
