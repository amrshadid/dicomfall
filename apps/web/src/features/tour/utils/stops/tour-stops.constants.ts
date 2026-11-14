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
    {
      id: 'title:drawing',
      selector: '.title__drawing',
      title: 'Fig. 1, the Archive Map around you',
      text: "The red flag is where you stand; the road below is what's next. Select it to open the whole map.",
      side: 'left',
    },
  ],
  map: [
    {
      id: 'map:drawing',
      selector: '.map-scroll',
      title: 'The Archive Map',
      text: 'Six stages and the Bridge, from the first byte of a file to the network. Each square on the road is a mission.',
      side: 'left',
    },
    {
      id: 'map:gauge',
      selector: '.map-gauge',
      title: 'The stage gauge',
      text: 'Every stage with how many missions you passed. Select one to go there, or Find me to come back.',
      side: 'right',
    },
    {
      id: 'map:detail',
      selector: '.map-detail__head',
      title: 'The selected mission',
      text: 'Select a mission to see what it asks, what it needs first, and to play it.',
      side: 'left',
    },
    {
      id: 'map:legend',
      selector: '.map-detail__legend',
      title: 'The legend',
      text: 'A mission is told by its shape: planned, locked, available, in progress or completed.',
      side: 'left',
    },
    {
      id: 'map:next',
      selector: '.map-topbar__next',
      title: 'Recommended next',
      text: 'Continue always goes to the next mission to play.',
      side: 'bottom',
    },
  ],
  mission: [
    {
      id: 'mission:guide',
      selector: '#mission-guide',
      title: 'The Guide',
      text: 'The story, a step at a time: it goes on when you finish a command or press Continue. Objectives tick by themselves.',
      side: 'right',
    },
    {
      id: 'mission:steps',
      selector: '.df-rail',
      title: 'Five steps',
      text: 'Scene, See it, Build it, Watch it, Debrief. Finished steps stay clickable so you can look again.',
      side: 'bottom',
    },
    {
      id: 'mission:objectives',
      selector: '.guide__objectives',
      title: 'Objectives',
      text: 'Each says ✓ Met, ◐ Partly or ✗ Not yet, and what the Machine saw. They tick by themselves and stay met.',
      side: 'right',
    },
    {
      id: 'mission:answer',
      selector: '.guide-box',
      title: 'Answer boxes',
      text: 'Type what the file says and press Enter or Give. A wrong answer is said plainly; try again as often as you like.',
      side: 'right',
    },
    {
      id: 'mission:console',
      selector: '#mission-console',
      title: 'The Console',
      text: "A shell in the lab's AE, on real Linux. Every command you type is real, and go-dicom is the tool you work with.",
      // Over the Inspector's right side; the prompt starts at the left.
      side: 'bottom',
      align: 'end',
    },
    {
      id: 'mission:inspector',
      selector: '#mission-inspector',
      title: 'The Inspector',
      text: 'File shows a file element by element beside its bytes; Wire shows each message between the AEs.',
      // Over the Console's right side, clear of its prompt.
      side: 'top',
      align: 'end',
    },
    {
      id: 'mission:selection',
      selector: '.file-inspector__bar',
      title: 'Marking bytes',
      text: 'Select a row, a band or a part, or drag over the hex. The bar says the marked bytes in offsets; a Mark objective reads them.',
      side: 'top',
      align: 'end',
    },
    {
      id: 'mission:preview',
      selector: '#mission-preview',
      title: 'The image',
      text: 'The instance as decoded from its bytes, with the elements that describe its pixels beside it.',
      side: 'left',
    },
    {
      id: 'mission:image',
      selector: '.lightbox-image__frame',
      title: "go-dicom's rendering",
      text: 'go-dicom convert draws the file the inspector shows, as a viewer would, and draws it again when the file changes.',
      side: 'left',
    },
    {
      id: 'mission:uids',
      selector: '#mission-uids',
      title: 'The UID trail',
      text: "The instance's identity, Study ▸ Series ▸ SOP Instance, everywhere it appears: on disk and on the wire.",
      side: 'left',
    },
    {
      id: 'mission:timeline',
      selector: '#mission-timeline',
      title: 'The timeline',
      text: "The run's events, in the order they happened.",
      side: 'left',
    },
    {
      id: 'mission:hint',
      selector: '.df-hint',
      title: 'Hints',
      text: 'Three of them: a nudge, then the idea, then the spot. Nothing is timed, and you can retry as often as you like.',
      side: 'bottom',
    },
    {
      id: 'mission:status',
      selector: '.df-status-bar',
      title: 'Status bar',
      text: 'Whether Linux and the lab are running. Press ? any time for every shortcut.',
      // Mid-screen, clear of the Guide's way-on button in the lower left.
      side: 'top',
      align: 'center',
    },
  ],
}
