import { warmOfflineImage } from '@app/offline'
import { useCheatSheet, usePanelSizes, useShowAllPanels } from '@app/store'
import { useActiveMission, useHints, useMissionActions, useProgress } from '@dicomfall/game/hooks'
import { useAeSelection, useCommandFinished, useMachineStatus } from '@dicomfall/machine/hooks'
import { useSaveStatus } from '@features/chrome/hooks/save'
import { useScreenChrome } from '@features/chrome/hooks/screen'
import { useContent } from '@features/content/hooks/content'
import { useGuidePace } from '@features/guide/hooks/pace'
import { waitReasonOf } from '@features/guide/utils/run'
import { beatsOf, blocksFor, pacedGuideOf, predictWaitsIn } from '@features/guide/utils/story'
import { MissionScreenPresentation } from '@features/mission/components/layout'
import { type UseMissionLabResult, useMissionLab } from '@features/mission/hooks/lab'
import { type UseMissionPlayResult, useMissionPlay } from '@features/mission/hooks/play'
import { useStoryStep } from '@features/mission/hooks/story'
import type { MissionRunView } from '@features/mission/types'
import {
  MACHINE_STATUS,
  MISSION_PANEL_IDS,
  MISSION_STEPS,
  openPanelsKey,
  panelsFor,
} from '@features/mission/utils/layout'
import { panelsOfStep, previousStepOf } from '@features/mission/utils/steps'
import { useShortcut } from '@features/shortcuts/hooks/keys'
import { terminalLabelOf } from '@features/terminal/utils/label'
import { useTourScreen } from '@features/tour/hooks/tour'
import { APP_MANUAL } from '@shared/constants/app'
import { useMachineLock } from '@shared/hooks/machine'
import { useNow } from '@shared/hooks/time'
import { hrefOf } from '@shared/navigation'
import { ariaKeyShortcut, SHORTCUTS } from '@shared/utils/keyboard'
import { labStatusOf } from '@shared/utils/machine'
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react'

export type MissionView = MissionRunView<UseMissionLabResult, UseMissionPlayResult>

export interface MissionContainerProps {
  missionId: string
  /** The panels that need the mission's lab are handed it; the others read the game and the Machine themselves. */
  guide: (view: MissionView) => ReactNode
  terminal: (view: MissionView) => ReactNode
  /** The Inspector and the Lightbox's image and UID trail read the file the play-through shows. */
  inspector: (view: MissionView) => ReactNode
  preview: (view: MissionView) => ReactNode
  uids: (view: MissionView) => ReactNode
  timeline: ReactNode
  /** Laid over the Bench and the Lightbox once the player opens it; handed the view for its Play it again. */
  debrief: (view: MissionView) => ReactNode
  /** Shown for an address that names no mission. */
  notFound: ReactNode
}

const CANNOT_OPEN = 'This mission could not be opened.'
const HINT_BINDING = SHORTCUTS.find((shortcut) => shortcut.id === 'hint')?.binding

const focusPanel = (id: string) => document.getElementById(id)?.focus()

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`

/**
 * A mission, played: opens it at its scene, builds its lab on the Machine, and lays the panels out
 * around it. Leaving the page closes the mission.
 */
export function MissionContainer({
  missionId,
  guide,
  terminal,
  inspector,
  preview,
  uids,
  timeline,
  debrief,
  notFound,
}: MissionContainerProps) {
  const content = useContent()
  const definition = content.game.mission(missionId) ?? null
  const { isOpen } = useProgress()
  const { start, begin, replay, showDebrief, leave } = useMissionActions()
  const active = useActiveMission()
  const [refused, setRefused] = useState<string | null>(null)

  // The save has to be loaded first: a mission started on an empty progress would be overwritten by it.
  useEffect(() => {
    if (!definition || !isOpen) {
      return
    }
    let left = false
    void start(definition.id).then((started) => {
      if (!left && !started.success) {
        setRefused(started.error?.message ?? CANNOT_OPEN)
      }
    })
    return () => {
      left = true
      leave()
    }
  }, [definition, isOpen, start, leave])

  const mission = active.mission?.id === missionId ? active.mission : null
  const run = useMissionLab(mission)
  // Once a lab is up the bandwidth is free: the rest of the image is cached for offline play.
  const labUp = run.phase === 'ready'
  useEffect(() => {
    if (labUp) {
      warmOfflineImage()
    }
  }, [labUp])
  const hints = useHints()
  const machine = useMachineStatus()
  const lock = useMachineLock(machine)
  const { ae, select } = useAeSelection()
  // A lab starts with the console in the Machine's own shell, which belongs to no AE: a newcomer
  // would type every command there and wonder where the lab's files went. So the console goes
  // into the AE the lab names as soon as the lab is built, and again after Start over brings the
  // Machine's shell back.
  const firstAe = mission?.lab.console ?? null
  const aesBuilt = run.phase === 'ready'
  useEffect(() => {
    if (aesBuilt && ae === null && firstAe !== null) {
      void select(firstAe)
    }
  }, [aesBuilt, ae, firstAe, select])
  const chrome = useScreenChrome()
  const { sizes, setPanelSize } = usePanelSizes()
  const showAll = useShowAllPanels()
  const { openCheatSheet } = useCheatSheet()
  const { saveState, lastSavedAt } = useSaveStatus()
  const now = useNow()
  const [restartOpen, setRestartOpen] = useState(false)
  const [replayOpen, setReplayOpen] = useState(false)

  const phase = active.phase ?? 'incident'
  // Every reset of the lab starts the story's played steps over.
  const [runs, setRuns] = useState(0)
  const startedOver = runs > 0
  const storyKey = `${missionId}#${runs}`
  const play = useMissionPlay(mission, run.phase, storyKey)
  // The live verdict once the lab is judged; before, the one the game kept, which after a reset
  // describes a lab that is gone.
  const verdict = play.verdict ?? (startedOver ? null : active.verdict)
  const passed = verdict?.passed ?? false
  const story = useStoryStep({ key: storyKey, phase, passed })
  const { step } = story
  const stepIndex = MISSION_STEPS.findIndex((entry) => entry.id === step)
  const panels = panelsFor(panelsOfStep(step), showAll)
  // Each new step can open a panel, which gets its own tour stop once.
  useTourScreen('mission', mission ? openPanelsKey(panels) : 'opening')

  // The current step's story, paced here as Kernelfall's level screen paces it: a command the
  // player finishes shows the next beat when it is the one the beat asked for.
  const storySections = mission ? content.storyOf(mission.id)?.sections : undefined
  const beats = useMemo(() => beatsOf(blocksFor(step, storySections)), [step, storySections])
  const pace = useGuidePace(`${storyKey}#${step}`)
  const paced = pacedGuideOf(beats, pace, false)
  useCommandFinished((_count, lines?: readonly string[]) => paced.onCommands(lines))
  // A range marked in the inspector, or an objective newly met by a mark or an answer, is what the
  // story's next pause may be waiting for, as a command is.
  const latestPaced = useRef(paced)
  latestPaced.current = paced
  const selection = play.actions.selection
  useEffect(() => {
    if (selection !== null) {
      latestPaced.current.onAction('selection')
    }
  }, [selection])
  const metCount = verdict?.objectives.filter((objective) => objective.result.passed).length ?? 0
  const metBefore = useRef(metCount)
  useEffect(() => {
    if (metCount > metBefore.current) {
      latestPaced.current.onAction('met')
    }
    metBefore.current = metCount
  }, [metCount])
  // A question is answered before the story moves on: the next step would show what it asked about.
  const predictWaits = predictWaitsIn(beats, pace.picks)

  const onNext = predictWaits
    ? null
    : step === 'scene'
      ? () => {
          begin()
          story.goTo('see')
        }
      : step === 'see'
        ? () => story.goTo('build')
        : step === 'build' && passed
          ? () => story.goTo('watch')
          : step === 'watch'
            ? showDebrief
            : null
  useShortcut('next-step', () => onNext?.(), mission !== null && onNext !== null)
  // As Kernelfall's: each press looks one done step further back, as clicking it on the rail does.
  const doneSteps = MISSION_STEPS.slice(0, Math.max(0, stepIndex)).map((entry) => entry.id)
  useShortcut(
    'previous-step',
    () => {
      const previous = previousStepOf(doneSteps, story.reviewing)
      if (previous !== null) {
        story.review(previous)
      }
    },
    mission !== null
  )
  // Hints are for the steps played on the lab, one at a time: a nudge, the concept, the spot.
  const hintEnabled = phase === 'play' && hints.next !== null
  const revealHint = () => {
    if (hintEnabled) {
      void hints.reveal()
    }
  }
  useShortcut('hint', revealHint, mission !== null && hintEnabled)
  useShortcut('focus-guide', () => focusPanel(MISSION_PANEL_IDS.guide), mission !== null)
  useShortcut('focus-inspector', () => focusPanel(MISSION_PANEL_IDS.inspector), mission !== null && panels.inspector)
  useShortcut('focus-lightbox', () => focusPanel(MISSION_PANEL_IDS.lightbox), mission !== null && panels.lightbox)

  if (!definition) {
    return notFound
  }
  if (refused !== null) {
    return (
      <MissionScreenPresentation
        layout={null}
        unavailable={{ reason: refused, titleHref: hrefOf({ name: 'title' }) }}
      />
    )
  }
  if (!mission) {
    return <MissionScreenPresentation layout={null} unavailable={null} />
  }

  const chapter = content.game.chapters.find((candidate) => candidate.id === mission.chapter)
  const number = content.game.numberOf(mission.id) ?? ''
  const restartWait = waitReasonOf(run.phase)
  // The story starts over in the lab's console AE, so the console goes back there too.
  const startOver = () => {
    setRuns((count) => count + 1)
    void run.startOver().then(() => {
      if (firstAe !== null) {
        void select(firstAe)
      }
    })
  }
  // As Kernelfall's Replay level: the mission again from its scene, on the lab as it found it,
  // with every hint to ask for again.
  const replayFromScene = () => {
    startOver()
    void replay()
  }
  const view: MissionView = {
    run,
    play,
    step,
    reviewing: story.reviewing,
    onEndReview: () => story.review(null),
    startedOver,
    onNext,
    onSkipToBuild:
      step === 'scene'
        ? () => {
            begin()
            story.skipToBuild()
          }
        : null,
    skippedSeeIt: story.skippedSeeIt,
    pace,
    onStartOver: () => setRestartOpen(true),
    // The debrief's Replay mission, unasked as Kernelfall's card replays. While the lab is busy,
    // the Replay dialog says why it has to wait.
    onPlayAgain: () => {
      if (restartWait !== null) {
        setReplayOpen(true)
        return
      }
      replayFromScene()
    },
  }
  const lastAttemptFellShort = verdict !== null && !verdict.passed
  const { lab } = mission

  return (
    <MissionScreenPresentation
      unavailable={null}
      layout={{
        chrome,
        panelSizes: { sizes, onResize: setPanelSize },
        page: `${mission.title}(${number})`,
        volume: chapter ? `${APP_MANUAL} · ${chapter.title}` : APP_MANUAL,
        bar: {
          mapHref: hrefOf({ name: 'map' }),
          heading: mission.title,
          subheading: chapter ? `${chapter.heading} · ${chapter.title}` : '',
          steps: MISSION_STEPS,
          currentIndex: stepIndex,
          reviewing: story.reviewing,
          // A done step is looked at again in the Guide; progress is kept.
          onReview: (stepId) => {
            const target = MISSION_STEPS.find((entry) => entry.id === stepId)
            if (target && MISSION_STEPS.indexOf(target) < stepIndex) {
              story.toggleReview(target.id)
            }
          },
          hintsLeft: hints.left,
          // Offered, never pushed: in Build it, after an attempt fell short and before the first hint.
          hintOffered: step === 'build' && lastAttemptFellShort && hints.revealed.length === 0,
          hintEnabled,
          hintKeyShortcut: HINT_BINDING ? ariaKeyShortcut(HINT_BINDING) : '',
          onHint: revealHint,
          onReplay: () => setReplayOpen(true),
        },
        panels,
        slots: {
          guide: guide(view),
          terminal: terminal(view),
          inspector: inspector(view),
          preview: preview(view),
          uids: uids(view),
          timeline,
        },
        terminalLabel: terminalLabelOf({ ae, firstAe, aesBuilt }),
        terminalStatus: lock?.title ?? null,
        titleBlock: [
          { label: 'Lab', value: `${plural(lab.aes.length, 'AE')}, ${plural(lab.links.length, 'link')}` },
          { label: 'Console', value: `AE ${lab.console}` },
          // A lab states only what it has: one with no fixtures lists none.
          ...(lab.files.length > 0 ? [{ label: 'Files', value: plural(lab.files.length, 'fixture') }] : []),
        ],
        debrief: phase === 'debrief' ? debrief(view) : null,
        restart: {
          open: restartOpen,
          unavailable: restartWait,
          onConfirm: () => {
            setRestartOpen(false)
            startOver()
          },
          onCancel: () => setRestartOpen(false),
        },
        replay: {
          open: replayOpen,
          unavailable: restartWait,
          onConfirm: () => {
            setReplayOpen(false)
            replayFromScene()
          },
          onCancel: () => setReplayOpen(false),
        },
        status: {
          save: saveState,
          savedAgoMs: lastSavedAt === null ? null : now - lastSavedAt,
          machine: labStatusOf(machine.phase, run.phase) ?? MACHINE_STATUS[machine.phase],
          onShortcuts: openCheatSheet,
        },
      }}
    />
  )
}
