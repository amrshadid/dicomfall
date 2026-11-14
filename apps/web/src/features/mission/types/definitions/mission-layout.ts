import type { GuidePace } from '@features/guide/types'
import type { PanelId, PanelSizes, RailStep, SaveState, ScreenChrome, TitleBlockEntry } from '@shared/types'
import type { ReactNode } from 'react'

export interface MissionTopBarData {
  /** Back to the Archive Map, as Kernelfall's top bar goes back to the Kernel Map. */
  readonly mapHref: string
  /** The mission's name. */
  readonly heading: string
  /** Where it sits in the journey, e.g. "Stage 1 · The First File" or "Bridge · On disk and on the wire". */
  readonly subheading: string
  readonly steps: readonly RailStep[]
  /** Index of the current step; `steps.length` once every step is done. */
  readonly currentIndex: number
  /** A done step being looked at again; null on the current one. */
  readonly reviewing: string | null
  onReview(stepId: string): void
  readonly hintsLeft: number
  /** There is a hint worth offering now. */
  readonly hintOffered: boolean
  readonly hintEnabled: boolean
  /** The Hint shortcut as `aria-keyshortcuts` wants it, e.g. `Alt+H`. */
  readonly hintKeyShortcut: string
  onHint(): void
  /** Asks to replay the mission from its scene, as Kernelfall's top bar asks to replay a level. */
  onReplay(): void
}

/** What goes in each panel. A slot whose panel is locked is not rendered. */
export interface MissionSlots {
  readonly guide: ReactNode
  /** The Bench's Console. */
  readonly terminal: ReactNode
  /** The Bench's Inspector, with its File and Wire tabs. */
  readonly inspector: ReactNode
  /** The Lightbox's three sections, top to bottom. */
  readonly preview: ReactNode
  readonly uids: ReactNode
  readonly timeline: ReactNode
}

/** Which panels the mission has opened so far. The Guide and the Console are always there. */
export interface MissionPanels {
  readonly inspector: boolean
  readonly lightbox: boolean
}

/** The sizes the player dragged the dividers to, and how to change them. */
export interface PanelLayout {
  readonly sizes: PanelSizes
  /** Null puts the panel back to its default size. */
  readonly onResize: (panel: PanelId, size: number | null) => void
}

export interface ConfirmDialog {
  readonly open: boolean
  /** Why it can't be done right now, said instead of the question; null or left out when it can. */
  readonly unavailable?: string | null
  onConfirm(): void
  onCancel(): void
}

export interface MissionStatusBar {
  readonly save: SaveState
  readonly savedAgoMs: number | null
  /** Where the Machine is, e.g. "The Machine: running". */
  readonly machine: string
  onShortcuts(): void
}

/** Everything the mission screen draws. */
export interface MissionLayoutModel {
  readonly chrome: ScreenChrome
  readonly panelSizes: PanelLayout
  /** The running head's page name, e.g. `The Preamble(1.1)`. */
  readonly page: string
  /** The running head's centre line. */
  readonly volume: string
  readonly bar: MissionTopBarData
  readonly panels: MissionPanels
  readonly slots: MissionSlots
  /** Whose shell the Console is, e.g. "AE workstation". */
  readonly terminalLabel: string
  /** What the Machine is doing or why it failed, or null when there is nothing to say. */
  readonly terminalStatus: string | null
  /** The drawing's title block, under the Lightbox: the lab, the console, the files. */
  readonly titleBlock: readonly TitleBlockEntry[]
  /** Laid over the Bench and the Lightbox once the mission is judged; null before. */
  readonly debrief: ReactNode | null
  /** The Guide's Start over: the lab as the mission found it, the play-through kept. */
  readonly restart: ConfirmDialog
  /** The top bar's Replay: the mission from its scene, its steps and hints dropped. */
  readonly replay: ConfirmDialog
  readonly status: MissionStatusBar
}

/** The steps of a mission's story: Scene, See it, Build it, Watch it, Debrief. */
export type MissionStepId = 'scene' | 'see' | 'build' | 'watch' | 'debrief'

/** What the mission's container hands to the slots that need its lab. */
export interface MissionRunView<Run, Play = null> {
  /** The mission's lab on the Machine: its phase, its last verdict, and how to start it over. */
  readonly run: Run
  /**
   * The play-through on that lab: the live verdict, what the player marked and typed, and the file
   * the inspector and the Lightbox show.
   */
  readonly play: Play
  /** The step the player is on. */
  readonly step: MissionStepId
  /** A done step looked back at; null on the current one. */
  readonly reviewing: MissionStepId | null
  /** Ends a look back and returns to the current step. */
  readonly onEndReview: () => void
  /**
   * The lab was put back to how the mission found it during this visit: the verdict the game saved
   * before then no longer describes it, so objectives are read from the lab alone.
   */
  readonly startedOver: boolean
  /**
   * Goes on to the next step of the story; null where the story moves on by itself or ends, and
   * while a question of the step waits for the player's call.
   */
  readonly onNext: (() => void) | null
  /** Jumps from the scene straight to Build it; null on other steps. */
  readonly onSkipToBuild: (() => void) | null
  /** Build it was reached by skipping See it, whose commands it may take for granted. */
  readonly skippedSeeIt: boolean
  /**
   * How far into the current step's story the player is. Kept here, beside the step, so the way on
   * can wait for an unanswered question and a look back at a done step leaves it where it was.
   */
  readonly pace: GuidePace
  /** Asks before the lab goes back to how the mission found it. */
  readonly onStartOver: () => void
  /**
   * Plays the mission again from its scene, as Kernelfall's Replay level does, without asking: the
   * lab goes back to how the mission found it, the objectives start unmet and the hints are all to
   * ask for again. The debrief's Replay mission.
   */
  readonly onPlayAgain: () => void
}

export interface MissionUnavailable {
  /** One line on why, in plain words. */
  readonly reason: string
  readonly titleHref: string
}

export interface MissionScreenPresentationProps {
  /** `null` while the mission is being opened. */
  layout: MissionLayoutModel | null
  /** A mission that can't be played gets a plain explanation, never a dead end. */
  unavailable: MissionUnavailable | null
}
