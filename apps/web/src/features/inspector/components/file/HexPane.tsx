import type { ByteRange, ElementPart } from '@dicomfall/game/types'
import type { ShowRegion } from '@dicomfall/machine/types'
import type { ElementPartRange } from '@features/inspector/types'
import {
  BYTES_PER_LINE,
  byteHex,
  byteText,
  hexLinesOf,
  hexOffset,
  inRange,
  lineIndexOf,
  REGION_LABELS,
  regionAt,
  regionRangeOf,
  spanOf,
} from '@features/inspector/utils/file'
import {
  type KeyboardEvent,
  type MouseEvent,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

export interface HexPaneProps {
  bytes: Uint8Array
  regions: readonly ShowRegion[]
  /** The marked range, drawn on the bytes. */
  marked: ByteRange | null
  /** The parts of the element the mark is in, each underlined in its own style. */
  parts: readonly ElementPartRange[]
  /** Changes each time a mark is made elsewhere (the tree, a band, a part), so the pane scrolls to it. */
  revealToken: number
  onMark: (range: ByteRange) => void
  /** The byte under the keyboard cursor, for the bar's readout. */
  onCursor: (offset: number) => void
}

/** Used until a line is measured (jsdom measures nothing). */
const FALLBACK_LINE_PX = 20
const FALLBACK_VIEW_PX = 400
/** Lines drawn past each edge of the view, so a fast scroll never shows a gap. */
const OVERSCAN = 8

const partAt = (parts: readonly ElementPartRange[], offset: number): ElementPart | null =>
  parts.find((entry) => inRange(entry.range, offset))?.part ?? null

/**
 * The file's bytes as `hexdump -C` prints them, each region's band before it starts, drawn only
 * where the view is: a CT file is hundreds of lines. Drag over bytes to mark them, or click one
 * and Shift-click another; with the keyboard, the arrow keys move and Shift with an arrow marks.
 */
export function HexPane({ bytes, regions, marked, parts, revealToken, onMark, onCursor }: HexPaneProps) {
  const view = useRef<HTMLDivElement>(null)
  const helpId = useId()
  const lines = useMemo(() => hexLinesOf(bytes.length, regions), [bytes.length, regions])
  const [linePx, setLinePx] = useState(FALLBACK_LINE_PX)
  const [scrollTop, setScrollTop] = useState(0)
  const [viewPx, setViewPx] = useState(FALLBACK_VIEW_PX)
  const [drag, setDrag] = useState<{ anchor: number; at: number } | null>(null)
  const anchor = useRef<number | null>(null)
  const [cursor, setCursor] = useState<number | null>(null)

  useLayoutEffect(() => {
    const element = view.current
    if (!element) {
      return
    }
    const measure = () => {
      const line = element.querySelector<HTMLElement>('.hex__line')
      const height = line?.getBoundingClientRect().height ?? 0
      if (height > 0) {
        setLinePx(height)
      }
      if (element.clientHeight > 0) {
        setViewPx(element.clientHeight)
      }
    }
    measure()
    if (typeof ResizeObserver === 'undefined') {
      return
    }
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const scrollToByte = useCallback(
    (offset: number) => {
      const element = view.current
      if (!element) {
        return
      }
      const top = lineIndexOf(lines, offset) * linePx
      if (top < element.scrollTop || top + linePx > element.scrollTop + element.clientHeight) {
        const target = Math.max(0, top - 2 * linePx)
        element.scrollTop = target
        setScrollTop(target)
      }
    },
    [lines, linePx]
  )

  // A mark made outside the pane (the tree, a band, a part, the objectives' file) is brought into
  // view; one made by dragging here already is, and the view stays where the player left it.
  const ownMark = useRef<number | null>(null)
  const markedFrom = marked?.from ?? null
  useEffect(() => {
    void revealToken
    if (markedFrom !== null && markedFrom !== ownMark.current) {
      scrollToByte(markedFrom)
    }
    ownMark.current = null
  }, [revealToken, markedFrom, scrollToByte])
  const markHere = useCallback(
    (range: ByteRange) => {
      ownMark.current = range.from
      onMark(range)
    },
    [onMark]
  )

  // A drag ends wherever the button comes up, inside the pane or not.
  useEffect(() => {
    if (drag === null) {
      return
    }
    const finish = () => {
      markHere(spanOf(drag.anchor, drag.at))
      setDrag(null)
    }
    window.addEventListener('mouseup', finish)
    return () => window.removeEventListener('mouseup', finish)
  }, [drag, markHere])

  const offsetOf = (event: MouseEvent): number | null => {
    const cell = (event.target as HTMLElement).closest<HTMLElement>('[data-offset]')
    return cell ? Number(cell.dataset.offset) : null
  }

  const onMouseDown = (event: MouseEvent<HTMLDivElement>) => {
    const offset = offsetOf(event)
    if (offset === null || event.button !== 0) {
      return
    }
    event.preventDefault()
    view.current?.focus({ preventScroll: true })
    // Shift-click marks from the byte clicked before: a whole Data Set without a long drag.
    const from = event.shiftKey && anchor.current !== null ? anchor.current : offset
    anchor.current = from
    setCursor(offset)
    onCursor(offset)
    setDrag({ anchor: from, at: offset })
  }

  const onMouseOver = (event: MouseEvent<HTMLDivElement>) => {
    if (drag === null) {
      return
    }
    const offset = offsetOf(event)
    if (offset !== null && offset !== drag.at) {
      setDrag({ anchor: drag.anchor, at: offset })
    }
  }

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const last = bytes.length - 1
    const from = cursor ?? marked?.from ?? 0
    const page = Math.max(1, Math.floor(viewPx / linePx) - 1) * BYTES_PER_LINE
    const moves: Record<string, number> = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -BYTES_PER_LINE,
      ArrowDown: BYTES_PER_LINE,
      PageUp: -page,
      PageDown: page,
      Home: -from,
      End: last - from,
    }
    const move = moves[event.key]
    if (move === undefined) {
      return
    }
    event.preventDefault()
    const next = Math.min(last, Math.max(0, from + move))
    if (event.shiftKey) {
      const start = anchor.current ?? from
      anchor.current = start
      markHere(spanOf(start, next))
    } else {
      anchor.current = next
    }
    setCursor(next)
    onCursor(next)
    scrollToByte(next)
  }

  const shown = drag === null ? marked : spanOf(drag.anchor, drag.at)
  const first = Math.max(0, Math.floor(scrollTop / linePx) - OVERSCAN)
  const last = Math.min(lines.length, Math.ceil((scrollTop + viewPx) / linePx) + OVERSCAN)
  const starts = new Set(regions.map((region) => region.offset).filter((offset) => offset > 0))

  return (
    <div className="hex">
      <p id={helpId} className="df-visually-hidden">
        Drag over bytes to mark them, or select one byte and Shift-select another. With the keyboard, the arrow keys
        move and Shift with an arrow key marks.
      </p>
      <div className="hex__head" aria-hidden="true">
        <span className="hex__band" />
        <span className="hex__offset">offset</span>
        <span className="hex__bytes">
          {Array.from({ length: BYTES_PER_LINE }, (_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: a column's place is its identity
            <span key={i} className={`hex__b${i === 8 ? ' hex__b--half' : ''}`}>
              {byteHex(i)}
            </span>
          ))}
        </span>
        <span className="hex__text">text</span>
      </div>
      {/* biome-ignore lint/a11y: the pane is one focus stop that takes the arrow keys over the bytes; a group of bytes is no fieldset, and a drag has its keyboard twin in Shift and the arrows */}
      <div
        ref={view}
        className="hex__view"
        role="group"
        aria-label="The file's bytes, sixteen to a line"
        aria-describedby={helpId}
        // biome-ignore lint/a11y/noNoninteractiveTabindex: one focus stop that takes the arrow keys over the bytes
        tabIndex={0}
        onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
        onMouseDown={onMouseDown}
        onMouseOver={onMouseOver}
        onKeyDown={onKeyDown}
      >
        <div className="hex__sheet" style={{ height: lines.length * linePx }}>
          <div className="hex__window" style={{ transform: `translateY(${first * linePx}px)` }}>
            {lines.slice(first, last).map((line) => {
              if (line.kind === 'band') {
                const range = regionRangeOf(line.region)
                return (
                  <button
                    type="button"
                    key={`band-${line.region.name}`}
                    className={`hex__line hex__bandline hex__bandline--${line.region.name}${
                      inRange(marked, range.from) && marked?.to === range.to ? ' is-marked' : ''
                    }`}
                    // The band is clicked, not dragged over: its mousedown must not start a drag.
                    onMouseDown={(event) => event.stopPropagation()}
                    onClick={() => onMark(range)}
                  >
                    <span className="hex__band" aria-hidden="true" />
                    <span className="hex__bandname">{REGION_LABELS[line.region.name]}</span>
                    <span className="hex__bandspan">
                      bytes {range.from} to {range.to - 1}, {range.to - range.from} bytes
                    </span>
                  </button>
                )
              }
              const region = regionAt(regions, line.start)
              const cells = Array.from({ length: BYTES_PER_LINE }, (_, i) => line.start + i)
              return (
                <div key={line.start} className="hex__line" aria-hidden="true">
                  <span className={`hex__band${region === null ? '' : ` hex__band--${region}`}`} />
                  <span className="hex__offset">{hexOffset(line.start)}</span>
                  <span className="hex__bytes">
                    {cells.map((offset, i) => {
                      if (offset >= bytes.length) {
                        return <span key={offset} className={`hex__b${i === 8 ? ' hex__b--half' : ''}`} />
                      }
                      const part = partAt(parts, offset)
                      const className = [
                        'hex__b',
                        i === 8 ? 'hex__b--half' : '',
                        starts.has(offset) ? 'hex__b--start' : '',
                        part === null ? '' : `hex__b--${part}`,
                        inRange(shown, offset) ? 'is-marked' : '',
                        offset === cursor ? 'is-cursor' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')
                      return (
                        <span key={offset} className={className} data-offset={offset}>
                          {byteHex(bytes[offset] ?? 0)}
                        </span>
                      )
                    })}
                  </span>
                  <span className="hex__text">
                    {cells.map((offset) =>
                      offset >= bytes.length ? null : (
                        <span
                          key={offset}
                          className={`hex__c${inRange(shown, offset) ? ' is-marked' : ''}`}
                          data-offset={offset}
                        >
                          {byteText(bytes[offset] ?? 0)}
                        </span>
                      )
                    )}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
