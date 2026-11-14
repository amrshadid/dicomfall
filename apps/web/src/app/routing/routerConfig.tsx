import type { Route } from '@shared/navigation'
import type { ReactNode } from 'react'
import { MapPage, NotFoundPage, SettingsPage, TitlePage } from '@/pages'

/** Every area page is a lazy chunk fetched when first visited. */
export function routeElement(route: Route): ReactNode {
  switch (route.name) {
    case 'title':
      return <TitlePage />
    case 'map':
      return <MapPage />
    // There is no mission page until the missions package exists, so no mission address leads anywhere.
    case 'mission':
      return <NotFoundPage />
    case 'settings':
      return <SettingsPage section={route.section} />
    case 'not-found':
      return <NotFoundPage />
  }
}
