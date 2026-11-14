import { useMemo } from 'react'
import { resizeVmTerminal } from '#services/vm/vm-connection.service'

export interface UseTerminalSizeResult {
  /** The console's rows and columns, so full-screen programs (less, top) fill it. */
  readonly resize: (rows: number, cols: number) => void
}

export function useTerminalSize(): UseTerminalSizeResult {
  return useMemo(() => ({ resize: resizeVmTerminal }), [])
}
