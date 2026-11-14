import type { MissionLayoutModel } from '@features/mission/types'
import { MISSION_STEPS } from '@features/mission/utils/layout'

const noop = () => {}

/** A whole mission screen with plain text in every slot, every panel open: tests change what they are about. */
export const MISSION_LAYOUT: MissionLayoutModel = {
  chrome: { themeLabel: 'Night print', onToggleTheme: noop, storageIssue: null, onExport: null, onTour: null },
  panelSizes: { sizes: { guide: null, lightbox: null, bench: null }, onResize: noop },
  page: 'The Four Regions(1.1)',
  volume: 'DICOMFall Imaging Manual · The First File',
  bar: {
    mapHref: '#/map',
    heading: 'The Four Regions',
    subheading: 'Stage 1 · The First File',
    steps: MISSION_STEPS,
    currentIndex: 1,
    reviewing: null,
    onReview: noop,
    hintsLeft: 3,
    hintOffered: false,
    hintEnabled: true,
    hintKeyShortcut: 'Alt+H',
    onHint: noop,
    onReplay: noop,
  },
  panels: { inspector: true, lightbox: true },
  slots: {
    guide: <p>guide slot</p>,
    terminal: <p>terminal slot</p>,
    inspector: <p>inspector slot</p>,
    preview: <p>preview slot</p>,
    uids: <p>uids slot</p>,
    timeline: <p>timeline slot</p>,
  },
  terminalLabel: 'AE workstation',
  terminalStatus: null,
  titleBlock: [{ label: 'Lab', value: '1 AE, 0 links' }],
  debrief: null,
  restart: { open: false, onConfirm: noop, onCancel: noop },
  replay: { open: false, onConfirm: noop, onCancel: noop },
  status: { save: 'saved', savedAgoMs: null, machine: 'The Machine: running', onShortcuts: noop },
}
