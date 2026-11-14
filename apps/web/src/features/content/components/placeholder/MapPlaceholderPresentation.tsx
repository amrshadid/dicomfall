import { ManHead, Sheet } from '@shared/components/layout'
import { ButtonLink } from '@shared/components/ui'
import { APP_MANUAL, APP_PAGE } from '@shared/constants/app'
import './MapPlaceholder.css'

export interface MapPlaceholderPresentationProps {
  titleHref: string
}

/** Where the Archive Map will be: printed in the manual's frame, so the title's links lead somewhere real. */
export function MapPlaceholderPresentation({ titleHref }: MapPlaceholderPresentationProps) {
  return (
    <div className="map-placeholder">
      <ManHead left={APP_PAGE} center={APP_MANUAL} right={APP_PAGE} />
      <Sheet as="main" aria-labelledby="map-placeholder-h" className="map-placeholder__sheet">
        <h1 id="map-placeholder-h" tabIndex={-1}>
          Archive Map
        </h1>
        <p>The map arrives with the first missions. Nothing is written for it yet.</p>
        <ButtonLink variant="primary" href={titleHref}>
          Back to the title
        </ButtonLink>
      </Sheet>
    </div>
  )
}
