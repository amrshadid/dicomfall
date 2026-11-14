import './Checklist.css'

/** A judged item's state: met, partly met, or not met yet. */
export type ItemState = 'met' | 'partly' | 'open'

const SYMBOL: Readonly<Record<ItemState, string>> = { met: '✓', partly: '◐', open: '✗' }
const WORD: Readonly<Record<ItemState, string>> = { met: 'Met', partly: 'Partly', open: 'Not yet' }

export interface StateMarkProps {
  state: ItemState
}

/** The symbol in its box, for the list's first column; the word goes with the text (`StateWord`). */
export function StateMark({ state }: StateMarkProps) {
  return (
    <span className={`df-mark df-mark--${state}`} aria-hidden="true">
      {SYMBOL[state]}
    </span>
  )
}

/** The state in a word, read before the item's text, so it never rests on the colour or the symbol alone. */
export function StateWord({ state }: StateMarkProps) {
  return <span className={`df-state df-state--${state}`}>{WORD[state]}</span>
}
