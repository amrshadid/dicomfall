import type { ReactNode } from 'react'
import { type ItemState, StateMark, StateWord } from './StateMark'
import { StatusMark } from './StatusMark'
import './Checklist.css'

export interface ChecklistItem {
  readonly id: string
  readonly text: ReactNode
  readonly passed: boolean
  /** Why it doesn't pass yet, from the checker's last run. Shown under the text in red. */
  readonly why?: ReactNode
  /** Met, partly or not yet, told by a symbol and a word; left out, the box alone tells passed or not. */
  readonly state?: ItemState
  /** Under everything else: what the player acts with, such as an answer box. */
  readonly extra?: ReactNode
}

export interface ChecklistProps {
  items: readonly ChecklistItem[]
  /** Set while the player is working, so open items stand out in bold with a red box. */
  emphasizeOpen?: boolean
}

/** Objectives tick live, never by a Submit button. */
export function Checklist({ items, emphasizeOpen = true }: ChecklistProps) {
  return (
    <ul className="df-checklist">
      {items.map((item) => (
        <li key={item.id} className={!item.passed && emphasizeOpen ? 'df-checklist__open' : undefined}>
          {item.state === undefined ? <StatusMark passed={item.passed} /> : <StateMark state={item.state} />}
          <span>
            {item.state !== undefined && <StateWord state={item.state} />}
            {item.text}
            {item.why !== undefined && <span className="df-checklist__why">{item.why}</span>}
            {item.extra}
          </span>
        </li>
      ))}
    </ul>
  )
}
