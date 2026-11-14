import { APP_NAME as APP, APP_TAGLINE as TAGLINE } from '@shared/constants/app'
import type { Route } from '@shared/types/definitions/route'

// The game's own title, not the wall's: search engines read the page at a phone's width, and this is the title they list.
const SMALL_SCREEN_TITLE = `${APP}: ${TAGLINE}`

/** Below the play width every route shows the small-screen wall. */
export function screenTitleOf(route: Route, wide: boolean): string {
  return wide ? documentTitleOf(route) : SMALL_SCREEN_TITLE
}

/** Most specific part first, so a narrow tab still says which screen it is. */
export function documentTitleOf(route: Route): string {
  switch (route.name) {
    case 'title':
      return `${APP}: ${TAGLINE}`
    case 'map':
      return `Archive Map · ${APP}`
    // No mission content is loaded yet, so there is no title to name it by.
    case 'mission':
      return `Mission · ${APP}`
    case 'settings':
      return `Settings · ${APP}`
    case 'not-found':
      return `Page not found · ${APP}`
  }
}
