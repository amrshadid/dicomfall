import { useEffect, useRef } from 'react'
import { useVmStore } from '#store/vm.store'

/**
 * How many commands the player has finished at the console since the Machine started: each
 * return to the prompt after an Enter. Only grows; a change means a command finished.
 */
export function useCommandsFinished(): number {
  return useVmStore((state) => state.commandsFinished)
}

/**
 * Calls `onFinished` each time a command the player typed has finished: the console is back at its
 * prompt (`workstation:~# `) after an Enter. `count` is the total so far; several commands typed
 * ahead of a running one may arrive as one call. `lines` are their command lines, oldest first,
 * each as the console showed it when Enter reached it, prompt included:
 * `workstation:~# ls -l /lab`.
 */
export function useCommandFinished(onFinished: (count: number, lines?: readonly string[]) => void): void {
  const latest = useRef(onFinished)
  latest.current = onFinished
  useEffect(
    () =>
      useVmStore.subscribe((state, previous) => {
        if (state.commandsFinished > previous.commandsFinished) {
          latest.current(state.commandsFinished, state.finishedLines)
        }
      }),
    []
  )
}
