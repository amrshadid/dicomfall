import { MapPlaceholderPresentation } from '@features/content/components/placeholder'
import { hrefOf } from '@shared/navigation'

export function MapPlaceholderContainer() {
  return <MapPlaceholderPresentation titleHref={hrefOf({ name: 'title' })} />
}
