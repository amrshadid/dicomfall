import type { GuideObjectiveInput } from '@features/guide/types'
import { Button, InlineText } from '@shared/components/ui'
import { type FormEvent, useEffect, useId, useState } from 'react'

export interface GuideObjectiveBoxProps {
  input: GuideObjectiveInput
  /** What the last value given came to, in words; null before the first or while nothing is to say. */
  feedback: string | null
}

const NOT_AN_OFFSET = 'An offset is a whole number of bytes from the start of the file, such as 132.'

// Backticks mark code in the objective's text; a screen reader should not spell them out.
const plain = (text: string) => text.replaceAll('`', '')

/**
 * The box beside an `answer` or `offset` objective: type, then Enter or Give. A wrong value is said
 * plainly under it, and the box keeps it, ready to be changed and given again. No timer.
 */
export function GuideObjectiveBox({ input, feedback }: GuideObjectiveBoxProps) {
  const [typed, setTyped] = useState(input.given ?? '')
  const [problem, setProblem] = useState<string | null>(null)
  const messageId = useId()
  const offset = input.kind === 'offset'
  // Start over forgets what was given: the box empties with it. Typing never clears it.
  useEffect(() => {
    if (input.given === null) {
      setTyped('')
      setProblem(null)
    }
  }, [input.given])

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (typed.trim() === '') {
      return
    }
    if (offset && !/^\s*\d+\s*$/.test(typed)) {
      setProblem(NOT_AN_OFFSET)
      return
    }
    setProblem(null)
    input.onSubmit(typed)
  }

  const message = problem ?? feedback
  return (
    <form className="guide-box" onSubmit={submit}>
      <span className="guide-box__row">
        <input
          className="guide-box__input"
          type="text"
          inputMode={offset ? 'numeric' : 'text'}
          value={typed}
          onChange={(event) => setTyped(event.target.value)}
          aria-label={`${offset ? 'Offset' : 'Answer'}: ${plain(input.label)}`}
          aria-describedby={message === null ? undefined : messageId}
          placeholder={offset ? 'offset in bytes' : 'your answer'}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
        />
        <Button type="submit" size="sm">
          Give
        </Button>
      </span>
      <span id={messageId} className="guide-box__message" aria-live="polite">
        {message !== null && <InlineText text={message.charAt(0).toUpperCase() + message.slice(1)} />}
      </span>
    </form>
  )
}
