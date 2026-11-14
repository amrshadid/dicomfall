import { Button } from '@shared/components/ui'
import './ConsentNotice.css'

export interface ConsentNoticePresentationProps {
  /** The privacy note in Settings. */
  privacyHref: string
  onAllow: () => void
  onDecline: () => void
}

/** A plate in the corner, not a modal: it never takes focus or covers play, and both answers weigh the same. */
export function ConsentNoticePresentation({ privacyHref, onAllow, onDecline }: ConsentNoticePresentationProps) {
  return (
    <aside className="df-consent" aria-labelledby="df-consent-title" aria-describedby="df-consent-text">
      <p className="df-consent__label">Notice · Usage recording</p>
      <h2 id="df-consent-title" className="df-consent__title">
        Help improve DICOMFall?
      </h2>
      <p id="df-consent-text" className="df-consent__text">
        Microsoft Clarity would record how you play: clicks, scrolling, the screens you open, and what you type in the
        console. It uses cookies. Your progress stays in your browser either way.
      </p>
      <div className="df-consent__actions">
        <Button size="sm" onClick={onAllow}>
          Allow
        </Button>
        <Button size="sm" onClick={onDecline}>
          No thanks
        </Button>
        <a className="df-consent__link" href={privacyHref}>
          What's recorded?
        </a>
      </div>
    </aside>
  )
}
