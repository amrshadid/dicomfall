import type { ReactNode } from 'react'
import './Banner.css'

export interface BannerProps {
  children: ReactNode
  /** An action that fixes the problem, e.g. "Export save". */
  action?: ReactNode
}

/** Non-blocking: never takes focus. */
export function Banner({ children, action }: BannerProps) {
  return (
    <div className="df-banner" role="status">
      <span className="df-banner__mark" aria-hidden="true">
        ▲
      </span>
      <p>{children}</p>
      {action}
    </div>
  )
}
