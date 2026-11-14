import type { Validated } from '@dicomfall/core/types'
import { useMemo } from 'react'
import { readVmFile, restoreVmSlot, runVmControl, saveVmSlot, setVmLinkLoss } from '#services/vm/vm-connection.service'
import type { LinkDefinition } from '#types/definitions/network'
import type { ControlReply } from '#types/definitions/vm'

export interface UseMachineControlsResult {
  /** Starts losing a share of a link's packets, both ways, or stops at 0; its interfaces stay up. */
  readonly setLinkLoss: (link: LinkDefinition, lossPercent: number) => Promise<boolean>
  /** Keeps the Machine as it is now: the lab as it was built, or as the player left it. */
  readonly saveSlot: (slot?: string) => Promise<boolean>
  /** Back to the saved Machine, at the moment it was saved; the events go back with it. */
  readonly restoreSlot: (slot?: string) => Promise<boolean>
  /** Runs a line as root, apart from the player's console; null while no VM runs. */
  readonly run: (line: string, timeoutMs?: number) => Promise<ControlReply | null>
  /** A file's bytes as root reads them: what a file check judges. */
  readonly readFile: (path: string) => Promise<Validated<Uint8Array>>
}

/** What a mission does to the Machine beside the player's own typing. */
export function useMachineControls(): UseMachineControlsResult {
  return useMemo(
    () => ({
      setLinkLoss: setVmLinkLoss,
      saveSlot: saveVmSlot,
      restoreSlot: restoreVmSlot,
      run: runVmControl,
      readFile: readVmFile,
    }),
    []
  )
}
