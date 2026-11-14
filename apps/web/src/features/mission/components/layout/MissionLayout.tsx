import { useHeaderWidth } from '@features/mission/hooks/layout'
import type { MissionLayoutModel } from '@features/mission/types'
import {
  hasLightbox,
  MISSION_PANEL_IDS as IDS,
  SPLIT_STEP_PERCENT,
  sizeVariables,
  WIDTH_STEP_REM,
} from '@features/mission/utils/layout'
import { ScreenFrame, Splitter, StatusBar } from '@shared/components/layout'
import { Dialog } from '@shared/components/modals'
import { Button, TitleBlock } from '@shared/components/ui'
import { limitsAtLeast } from '@shared/utils/layout'
import { PANEL_LIMITS } from '@shared/utils/settings'
import type { CSSProperties } from 'react'
import { MissionTopBar } from './MissionTopBar'
import './MissionLayout.css'

export type MissionLayoutProps = MissionLayoutModel

const PERCENT = 100

const remPx = () => Number.parseFloat(getComputedStyle(document.documentElement).fontSize)
const widthOf = (id: string) => (document.getElementById(id)?.getBoundingClientRect().width ?? 0) / remPx()
const heightOf = (id: string) => document.getElementById(id)?.getBoundingClientRect().height ?? 0
const consoleShare = () => (heightOf(IDS.console) / Math.max(1, heightOf(IDS.bench))) * PERCENT
const percentPx = () => heightOf(IDS.bench) / PERCENT

/**
 * The mission's sheet: the Guide on the left, the Bench (the Console over the Inspector) in the
 * middle, the Lightbox (preview, UID trail, timeline) on the right. A panel the mission hasn't
 * opened is not drawn.
 */
export function MissionLayout({
  chrome,
  page,
  volume,
  bar,
  panels,
  slots,
  terminalLabel,
  terminalStatus,
  titleBlock,
  debrief,
  restart,
  replay,
  status,
  panelSizes,
}: MissionLayoutProps) {
  const lightbox = hasLightbox(panels)
  const { sizes, onResize } = panelSizes
  // Title, Replay and the mission's name sit over the Guide, so it never gets narrower than they are.
  const guideLimits = limitsAtLeast(PANEL_LIMITS.guide, useHeaderWidth('.mission-topbar__name', IDS.guide))
  const covered = debrief !== null

  return (
    <ScreenFrame
      page={page}
      volume={volume}
      chrome={chrome}
      topbar={
        <>
          <a className="mission-skip" href={`#${IDS.bench}`}>
            Skip to the Bench
          </a>
          <MissionTopBar bar={bar} onMenu={status.onShortcuts} />
        </>
      }
      foot={
        <StatusBar
          save={status.save}
          savedAgoMs={status.savedAgoMs}
          items={[status.machine]}
          end={
            <button type="button" className="mission-status__shortcuts" onClick={status.onShortcuts}>
              Shortcuts <kbd>?</kbd>
            </button>
          }
        />
      }
    >
      <main
        className={`mission-work screen__sheet df-sheet mission-work--${lightbox ? 'with' : 'no'}-lightbox`}
        style={sizeVariables(sizes, guideLimits.min) as CSSProperties}
      >
        <aside className="mission-guide" id={IDS.guide} aria-label="Guide" tabIndex={-1}>
          {slots.guide}
        </aside>
        <Splitter
          label="Resize the Guide"
          orientation="vertical"
          direction={1}
          limits={guideLimits}
          step={WIDTH_STEP_REM}
          value={sizes.guide}
          measure={() => widthOf(IDS.guide)}
          pxPerUnit={remPx}
          onResize={(size) => onResize('guide', size)}
          onReset={() => onResize('guide', null)}
        />

        <section
          id={IDS.bench}
          className={`mission-bench${panels.inspector ? '' : ' mission-bench--console-only'}`}
          aria-label="Bench"
          tabIndex={-1}
          inert={covered}
        >
          <section className="mission-console" id={IDS.console} aria-label="Console" tabIndex={-1}>
            <div className="mission-console__head">
              Console
              <span role="status" aria-live="polite">
                {terminalStatus ?? terminalLabel}
              </span>
            </div>
            <div className="mission-console__slot">{slots.terminal}</div>
          </section>
          {panels.inspector && (
            <Splitter
              label="Resize the Console and the Inspector"
              orientation="horizontal"
              direction={1}
              limits={PANEL_LIMITS.bench}
              step={SPLIT_STEP_PERCENT}
              value={sizes.bench}
              measure={consoleShare}
              pxPerUnit={percentPx}
              onResize={(size) => onResize('bench', size)}
              onReset={() => onResize('bench', null)}
            />
          )}
          {panels.inspector && (
            <div className="mission-bench__inspector" id={IDS.inspector} tabIndex={-1}>
              {slots.inspector}
            </div>
          )}
        </section>

        {lightbox && (
          <Splitter
            inert={covered}
            label="Resize the Lightbox"
            orientation="vertical"
            direction={-1}
            limits={PANEL_LIMITS.lightbox}
            step={WIDTH_STEP_REM}
            value={sizes.lightbox}
            measure={() => widthOf(IDS.lightbox)}
            pxPerUnit={remPx}
            onResize={(size) => onResize('lightbox', size)}
            onReset={() => onResize('lightbox', null)}
          />
        )}
        {/* A plain column, not a landmark: each of its sections names its own region. */}
        {lightbox && (
          <div className="mission-lightbox" id={IDS.lightbox} tabIndex={-1} inert={covered}>
            <div className="mission-lightbox__preview" id={IDS.preview}>
              {slots.preview}
            </div>
            <div className="mission-lightbox__uids" id={IDS.uids}>
              {slots.uids}
            </div>
            <div className="mission-lightbox__timeline" id={IDS.timeline}>
              {slots.timeline}
            </div>
            <TitleBlock entries={titleBlock} />
          </div>
        )}

        {/* The debrief takes the Bench and the Lightbox together, so it reads whole on a narrow screen. */}
        {debrief !== null && <div className="mission-debrief">{debrief}</div>}
      </main>

      <Dialog
        open={restart.open}
        onClose={restart.onCancel}
        title="Start this mission again?"
        actions={
          <>
            <Button variant="quiet" onClick={restart.onCancel}>
              Keep going
            </Button>
            {!restart.unavailable && (
              <Button variant="primary" onClick={restart.onConfirm}>
                Start again
              </Button>
            )}
          </>
        }
      >
        {restart.unavailable ? (
          <p>{restart.unavailable} Try again when the lab is yours to use.</p>
        ) : (
          <p>
            The lab goes back to how the mission found it. Every file you changed in it is put back. The attempts you
            made and the hints you asked for are kept. Retrying is free, and nothing is timed.
          </p>
        )}
      </Dialog>

      <Dialog
        open={replay.open}
        onClose={replay.onCancel}
        title="Replay this mission?"
        actions={
          <>
            <Button variant="quiet" onClick={replay.onCancel}>
              Keep playing
            </Button>
            {!replay.unavailable && (
              <Button variant="primary" onClick={replay.onConfirm}>
                Replay from the scene
              </Button>
            )}
          </>
        }
      >
        {replay.unavailable ? (
          <p>{replay.unavailable} Try again when the lab is yours to use.</p>
        ) : (
          <p>
            The mission starts again from its scene, on the lab as the mission found it: this play-through's steps and
            hints are dropped. A mission you already completed stays completed.
          </p>
        )}
      </Dialog>
    </ScreenFrame>
  )
}
