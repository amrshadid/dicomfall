import { useLinuxTerminal, useMachineStatus, useTerminalSize } from '@dicomfall/machine/hooks'
import type { VmPhase } from '@dicomfall/machine/types'
import { useShortcut } from '@features/shortcuts/hooks/keys'
import { TerminalPresentation } from '@features/terminal/components/terminal'
import { type TerminalView, useTerminalView } from '@features/terminal/hooks/view'
import { createAeMoveFilter } from '@features/terminal/utils/ae-move'
import { clearsTerminal, vmStatusLine } from '@features/terminal/utils/vm'
import { useMachineLock } from '@shared/hooks/machine'
import { LAB_BUILDING_LOCK } from '@shared/utils/machine'
import { useEffect, useRef } from 'react'

export interface TerminalContainerProps {
  /** The mission's lab is still being built: the console waits for it. */
  building?: boolean
}

/** How long after the lab is built the console waits for the AE's prompt before showing the Machine's. */
const PROMPT_HOLD_MS = 5000

/** The Console on the Machine: keys go to the selected AE's shell, its output comes back as bytes. */
export function TerminalContainer({ building = false }: TerminalContainerProps) {
  const container = useRef<HTMLDivElement>(null)
  // The Machine's bytes can arrive before the view is made; the view keeps what comes before it opens.
  const view = useRef<TerminalView | null>(null)
  // Text, not bytes, on its way to the screen: a move into an AE is said in a line of its own.
  const decoder = useRef(new TextDecoder())
  const filter = useRef(createAeMoveFilter())
  const { phase, detail, send } = useLinuxTerminal((bytes) => {
    const shown = filter.current.write(decoder.current.decode(bytes, { stream: true }))
    if (shown !== '') {
      view.current?.write(shown)
    }
  })
  const { resize } = useTerminalSize()
  const machineLock = useMachineLock(useMachineStatus())
  const lock = machineLock ?? (building ? LAB_BUILDING_LOCK : null)
  // While a lab is restored the Machine holds keys for the new shell, so they are sent, not dropped.
  const locked = lock !== null && !lock.holdsKeys
  const terminal = useTerminalView(container, { onInput: send, onResize: resize, locked })
  view.current = terminal

  // Start over, a replayed mission and a new lab replace the shell: its old prompt goes with it.
  const shownPhase = useRef<VmPhase | null>(null)
  useEffect(() => {
    if (clearsTerminal(shownPhase.current, phase)) {
      terminal.clear()
      filter.current.reset()
    }
    shownPhase.current = phase
    const line = vmStatusLine(phase, detail)
    if (line !== null) {
      terminal.write(line)
    }
  }, [phase, detail, terminal])

  // Once the lab is built the console moves into its AE. A lab that failed leaves it in the
  // Machine's shell, whose held prompt is then shown, so the console is never left without one.
  useEffect(() => {
    if (building) {
      return
    }
    const timer = window.setTimeout(() => {
      const shown = filter.current.flush()
      if (shown !== '') {
        terminal.write(shown)
      }
    }, PROMPT_HOLD_MS)
    return () => window.clearTimeout(timer)
  }, [building, terminal])

  useShortcut('focus-terminal', terminal.focus)

  return <TerminalPresentation ref={container} lock={lock} />
}
