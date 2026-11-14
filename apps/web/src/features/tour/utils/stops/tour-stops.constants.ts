import type { TourStop } from '@features/tour/types'
import type { TourScreen } from '@shared/types'

/** The longest a stop's text may be: one short sentence or two, read in a glance. */
export const MAX_STOP_TEXT_LENGTH = 140

/**
 * The guided tours, one short sentence per stop. A stop whose panel isn't on
 * screen yet is skipped, and it plays the first time that panel appears.
 */
export const TOUR_STOPS: Readonly<Record<TourScreen, readonly TourStop[]>> = {
  title: [
    {
      id: 'title:start',
      // The button itself, not its wrapper with the lines under it.
      selector: '.title__continue [data-primary]',
      title: 'Start here',
      text: 'This button always takes you to the next thing to do, and the game saves itself as you play.',
      side: 'right',
    },
    {
      id: 'title:contents',
      selector: '.title__menu',
      title: 'Table of contents',
      text: 'The Archive Map picks missions from the first byte of a file to the network, and Settings holds the theme and your saves.',
      side: 'right',
    },
  ],
}
