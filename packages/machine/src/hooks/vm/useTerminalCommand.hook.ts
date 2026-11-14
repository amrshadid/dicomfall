import { useMemo } from 'react'
import { sendToVm } from '#services/vm/vm-connection.service'

export interface UseTerminalCommandResult {
  /** Types a command line into the console and presses Enter, as the player would. */
  readonly run: (commandLine: string) => void
}

/** Runs a command line in the console: for the Guide's command chips. */
export function useTerminalCommand(): UseTerminalCommandResult {
  // `\r` is the key a terminal sends for Enter, so the line finishes as a typed one does.
  return useMemo(() => ({ run: (commandLine: string) => sendToVm(`${commandLine}\r`) }), [])
}
