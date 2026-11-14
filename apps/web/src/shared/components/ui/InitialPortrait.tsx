import type { PortraitProps } from '@shared/types'
import './Portrait.css'

export interface InitialPortraitProps extends PortraitProps {
  /** The guide's initial, drawn until the guide has a portrait of its own. */
  initial: string
}

/**
 * A guide without a drawn portrait yet: their initial in the same 56-unit box every portrait is
 * drawn in, so the dialogue's header and cut-ins keep their sizes when the drawing comes.
 */
export function InitialPortrait({ initial, size = 56 }: InitialPortraitProps) {
  return (
    <svg className="df-portrait" viewBox="0 0 56 56" width={size} height={size} aria-hidden="true">
      <rect x="1" y="1" width="54" height="54" fill="none" stroke="var(--ink)" strokeWidth="2" />
      <text
        x="28"
        y="29"
        textAnchor="middle"
        dominantBaseline="central"
        fill="var(--ink)"
        style={{ fontFamily: 'var(--face)' }}
        fontSize="26"
        fontWeight="700"
      >
        {initial}
      </text>
    </svg>
  )
}
