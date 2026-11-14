import { useEffect, useRef } from 'react'
import { connectVm, disconnectVm, onVmOutput, sendToVm } from '#services/vm/vm-connection.service'
import { useVmStore } from '#store/vm.store'
import type { VmPhase } from '#types/definitions/vm'

export interface UseLinuxTerminalResult {
  readonly phase: VmPhase
  /** Why it failed. */
  readonly detail: string | null
  /** Keys typed at the console, as the terminal reports them. */
  readonly send: (text: string) => void
}

/** The console, the real Linux VM's terminal: starts the VM while mounted, hands every byte it prints to `onOutput`. */
export function useLinuxTerminal(onOutput: (bytes: Uint8Array) => void): UseLinuxTerminalResult {
  const { phase, detail } = useVmStore((state) => state.status)
  const latestOutput = useRef(onOutput)
  latestOutput.current = onOutput

  useEffect(() => onVmOutput((bytes) => latestOutput.current(bytes)), [])

  useEffect(() => {
    connectVm(
      (status) => useVmStore.getState().setStatus(status),
      (update) => useVmStore.getState().applyEvents(update),
      (update) => useVmStore.getState().applyShell(update)
    )
    return () => {
      if (disconnectVm().stopped) {
        useVmStore.getState().reset()
      }
    }
  }, [])

  return { phase, detail, send: sendToVm }
}
