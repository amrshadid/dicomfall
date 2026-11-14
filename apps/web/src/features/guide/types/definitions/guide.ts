import type { ButtonVariant } from '@shared/types'

/** The five steps of a mission's story, as the step rail names them. */
export type GuideStepId = 'scene' | 'see' | 'build' | 'watch' | 'debrief'

/**
 * One block of a story section, as the story format gives it: a line by a speaker (null for
 * narration), a code block as the Machine printed it, a pause, or a question with its answers.
 */
export type GuideStoryBlock =
  | { readonly kind: 'line'; readonly speaker: string | null; readonly text: string }
  | { readonly kind: 'code'; readonly text: string }
  | { readonly kind: 'pause' }
  | {
      readonly kind: 'predict'
      readonly speaker: string | null
      readonly text: string
      readonly options: readonly GuideOption[]
    }

export interface GuideOption {
  readonly text: string
  readonly right: boolean
}

/** A mission's story by section slug (`scene`, `see-it`, `build-it`, `watch-it`, `debrief`, `real-world`). */
export type GuideStory = ReadonlyMap<string, readonly GuideStoryBlock[]>

/** Who speaks in a story, by the name the story gives them. */
export interface SpeakerInfo {
  readonly id: string
  readonly name: string
  /** The real thing they are, e.g. "the 128 bytes at the start of a Part 10 file". */
  readonly term: string
  /** Which portrait to draw, or null for a voice without one. */
  readonly portrait: GuidePortraitId | null
}

/** The six guides of the standard, one per stage (the Instance UID also guides the Bridge). */
export type GuidePortraitId = 'preamble' | 'vr' | 'instance-uid' | 'scp' | 'archive' | 'conformance-statement'

/** A line of the Guide's transcript; `speaker` is the name as the story wrote it. */
export interface GuideLine {
  readonly speaker: string | null
  readonly text: string
}

/** A question the player answers before the story does. No score. */
export interface GuidePredict {
  readonly kind: 'predict'
  /** Its place among the step's questions. */
  readonly id: number
  readonly line: GuideLine
  readonly options: readonly GuideOption[]
  /** A pause follows it in the story: the answer waits for the player's command, not only their pick. */
  readonly held: boolean
  /** The option the player chose; null if they asked to be shown, or haven't answered. */
  readonly picked: number | null
  /** What happens is marked; false while unanswered, or answered and still waiting for the command. */
  readonly revealed: boolean
  /** Answers it (null: just show me); null once answered. */
  readonly onPick: ((option: number | null) => void) | null
}

/** A run of lines, a code block, a heading inside a step, or a question, in the order the story has them. */
export type GuidePart =
  | { readonly kind: 'lines'; readonly lines: readonly GuideLine[] }
  | { readonly kind: 'code'; readonly text: string }
  | { readonly kind: 'heading'; readonly text: string }
  | GuidePredict

/** The transcript up to the next thing the player does. */
export type GuideBeat = readonly GuidePart[]

/** How many beats the player has reached on the step shown, and what they answered. */
export interface GuidePace {
  readonly shown: number
  /** By question id; null where the player asked to be shown. */
  readonly picks: Readonly<Record<number, number | null>>
  /** Shows the next beat, or `steps` more. */
  advance(steps?: number): void
  /** Records an answer and shows the story up to `shown` beats. */
  pick(predict: number, option: number | null, shown: number): void
}

/** An objective's state, told by a symbol and a word as well as a colour: ✓ met, ◐ partly, ✗ not yet. */
export type GuideObjectiveState = 'met' | 'partly' | 'open'

/** The box beside an `answer` or `offset` objective, where the player gives a value. */
export interface GuideObjectiveInput {
  /** `answer` takes text, `offset` a whole number of bytes. */
  readonly kind: 'answer' | 'offset'
  /** What the box asks, for screen readers: the objective's text. */
  readonly label: string
  /** The value last given, kept in the box after it was judged; null before the first. */
  readonly given: string | null
  /** Gives the value; it is judged at once, and a wrong one can be given again at no cost. */
  readonly onSubmit: (value: string) => void
}

export interface GuideObjective {
  readonly id: string
  readonly text: string
  /** Judged by what is true in the lab's files or on the wire, never by which command was typed. */
  readonly passed: boolean
  /** `partly` when what the player did is near: a marked range that covers part of the bytes asked for. */
  readonly state?: GuideObjectiveState
  /** The answer or offset box, while the objective is open; null for every other check. */
  readonly input?: GuideObjectiveInput | null
  /** What the Machine showed instead, when the check could say; shown under an open objective. */
  readonly observed?: string | null
  /** What the Machine showed that met it, with its terms explained; shown under a met objective. */
  readonly evidence?: string | null
}

/** A revealed hint: a nudge first, then the concept, then the spot. No hint gives a command. */
export interface GuideHint {
  /** "a nudge", "the concept", "the spot". */
  readonly tier: string
  readonly text: string
}

export interface GuideHints {
  /** Who gives them: the stage's guide, such as The Preamble. */
  readonly by: string
  /** The hints asked for so far, in order. */
  readonly revealed: readonly GuideHint[]
  /** How many are still to ask for. */
  readonly left: number
  /** Reveals the next one; null when there is none, or hints are not offered on this step. */
  readonly onReveal: (() => void) | null
}

/** A command the mission offers, with what it does in one line. */
export interface GuideChip {
  readonly command: string
  readonly explain: string
  /** A whole command line runs at the console on a click; a bare name only names it. */
  readonly onRun: (() => void) | null
}

/** A Codex card the mission files, opened over the mission so reading never leaves it. */
export interface GuideCodexLink {
  readonly id: string
  readonly term: string
  readonly href: string
}

export interface GuideAction {
  readonly id: string
  readonly label: string
  readonly kind: ButtonVariant
  /** Shortcut shown on the button, as the player's OS prints it ("⌥N", "Alt+N"). */
  readonly keys?: string
  /** Why it can't be used now, e.g. "The lab is still being built."; the button stays focusable so this can be read. */
  readonly unavailable?: string | null
  onSelect(): void
}

/** What the lab is doing right now, in one line a beginner can follow. */
export interface GuideStatus {
  readonly text: string
  /** Something is running: the line is marked as busy. */
  readonly busy: boolean
  readonly failed: boolean
  /** The Machine's own words for a failure, one per line. */
  readonly details: readonly string[]
}

export interface GuidePresentationProps {
  /** The step on show, e.g. "See it". */
  stepLabel: string
  /** Set while looking back at a done step. */
  reviewNote: string | null
  /** A line before the story, such as how to get where a skipped step left the terminal; null for none. */
  lead?: string | null
  /** The beats reached so far; the last one is where the player is. */
  beats: readonly GuideBeat[]
  /** Shows the next beat without running anything; null on the last one or while a question waits. */
  onContinue: (() => void) | null
  /** The scene is read first; the list comes with the first thing the player is asked to do. */
  showObjectives: boolean
  objectives: readonly GuideObjective[]
  /** While building only. */
  chips: readonly GuideChip[]
  hints: GuideHints
  codex: readonly GuideCodexLink[]
  /** The cards lie open once the mission's terms have been met; before, they fold to one line. */
  codexOpen: boolean
  /** A quiet line under everything else; null for none. */
  note: string | null
  /** The way on, kept in view under the scrolling transcript. */
  actions: readonly GuideAction[]
  /** Kept in view over the actions; null or left out when there is nothing to say. */
  status?: GuideStatus | null
}
