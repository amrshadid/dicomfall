import { useCallback } from 'react'
import { selectVmAe } from '#services/vm/vm-connection.service'
import { useVmStore } from '#store/vm.store'

export interface UseAeSelectionResult {
  /** The AE the console is in, as the Machine last said; null for the Machine itself. */
  readonly ae: string | null
  /** Moves the console into an AE: its shell, its address, its links. */
  readonly select: (ae: string | null) => Promise<void>
}

export function useAeSelection(): UseAeSelectionResult {
  // The Machine says where its shell is after every move and every restore, so this never
  // differs from the console: a restore can put the shell back in another AE.
  const ae = useVmStore((state) => state.ae)
  const select = useCallback(async (next: string | null) => {
    await selectVmAe(next)
  }, [])
  return { ae, select }
}
