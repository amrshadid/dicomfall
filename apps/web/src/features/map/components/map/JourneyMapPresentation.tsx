import type { MapDetail, MapView } from '@features/map/types'
import { ManHead, ScreenFrame } from '@shared/components/layout'
import { ButtonLink, Icon, Segmented } from '@shared/components/ui'
import { APP_MANUAL } from '@shared/constants/app'
import type { ScreenChrome } from '@shared/types'
import './JourneyMap.css'
import { MapDetailPanel } from './MapDetailPanel'
import { MapSection, type MapSectionProps } from './MapSection'

export interface JourneyMapPresentationProps {
  chrome: ScreenChrome
  titleHref: string
  /** What the stops are named by: their mission, or the first skill it earns. */
  view: MapView
  onView: (view: MapView) => void
  /** Where Continue goes; null when every mission that is open is completed. */
  recommended: { readonly label: string; readonly href: string } | null
  section: MapSectionProps
  detail: MapDetail
  /** "Stage 1, The First File: 0 of 6 missions passed · 6 stages planned". */
  summary: string
  version: string
  onShortcuts: () => void
}

/** The Archive Map: the journey's stages top to bottom, with a detail panel for the selected stop. */
export function JourneyMapPresentation({
  chrome,
  titleHref,
  view,
  onView,
  recommended,
  section,
  detail,
  summary,
  version,
  onShortcuts,
}: JourneyMapPresentationProps) {
  return (
    <ScreenFrame
      page="Archive-map(7)"
      volume={`${APP_MANUAL} · General drawing of the journey`}
      chrome={chrome}
      topbar={
        <nav className="screen__topbar map-topbar" aria-label="Archive Map">
          <ButtonLink href={titleHref} variant="quiet">
            <Icon name="back" />
            Title
          </ButtonLink>
          <h1 tabIndex={-1} className="map-topbar__title">
            Archive Map
          </h1>
          <Segmented
            legend="Show"
            options={[
              { value: 'missions', label: 'Missions' },
              { value: 'skills', label: 'Skills' },
            ]}
            value={view}
            onChange={onView}
          />
          {recommended && (
            <p className="map-topbar__next">
              Recommended next: <b title={recommended.label}>{recommended.label}</b>
              <ButtonLink variant="primary" href={recommended.href}>
                Continue
              </ButtonLink>
            </p>
          )}
        </nav>
      }
      foot={
        <ManHead
          kind="foot"
          left={summary}
          center={version}
          right={
            <button type="button" className="map-foot__shortcuts" onClick={onShortcuts}>
              Shortcuts <kbd>?</kbd>
            </button>
          }
        />
      }
    >
      <main className="map-board screen__sheet df-sheet">
        <figure className="map-board__drawing">
          <MapSection {...section} />
          <figcaption>
            Fig. 2. The journey in section, the first byte of a file down to an imaging network. Arrow keys walk the
            road, Page Up and Page Down change stage, Enter plays.
          </figcaption>
        </figure>
        <MapDetailPanel detail={detail} />
      </main>
    </ScreenFrame>
  )
}
