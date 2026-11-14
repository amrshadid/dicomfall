import type { LabDefinition, MissionDefinition } from '@dicomfall/game/types'
import { useMachineControls, useNetwork } from '@dicomfall/machine/hooks'
import type { NetworkDefinition } from '@dicomfall/machine/types'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

/** Where a mission's lab is on the Machine. */
export type MissionLabPhase =
  /** The AEs, their links and the fixtures are being set up. */
  | 'building'
  /** The lab is the player's to use. */
  | 'ready'
  /** `startOver` is putting the lab back as the mission found it. */
  | 'restoring'
  | 'failed'

export interface UseMissionLabResult {
  readonly phase: MissionLabPhase
  /** Why the lab could not be built: the line that failed and what it printed. */
  readonly errors: readonly string[]
  /** Back to the lab as it was first built: every file the player changed is put back. */
  readonly startOver: () => Promise<void>
}

/** The Machine slot the built lab is kept in, for Start over. */
export const START_SLOT = 'mission-start'

/** The parts of a mission's lab the Machine builds. */
export function networkOfLab(lab: LabDefinition): NetworkDefinition {
  return {
    aes: lab.aes.map(({ name, title, address }) =>
      address === undefined ? { name, title } : { name, title, address }
    ),
    links: lab.links,
    files: lab.files,
  }
}

/**
 * Builds the mission's lab on the Machine once Linux is up, keeps it as it was built, and puts it
 * back on Start over. Nothing is judged here: `useMissionPlay` judges the play-through on the lab.
 */
export function useMissionLab(mission: MissionDefinition | null): UseMissionLabResult {
  const network = useMemo(() => (mission ? networkOfLab(mission.lab) : null), [mission])
  const key = mission ? `${mission.id}@${mission.version}` : ''
  const built = useNetwork(network, key)
  const { saveSlot, restoreSlot } = useMachineControls()
  const [restoring, setRestoring] = useState(false)
  // Saved once per lab: a second save after Start over would keep the player's changes instead.
  const savedKey = useRef<string | null>(null)

  useEffect(() => {
    if (built.phase === 'ready' && key !== '' && savedKey.current !== key) {
      savedKey.current = key
      void saveSlot(START_SLOT)
    }
  }, [built.phase, key, saveSlot])

  const startOver = useCallback(async () => {
    if (built.phase !== 'ready' || restoring) {
      return
    }
    setRestoring(true)
    try {
      await restoreSlot(START_SLOT)
    } finally {
      setRestoring(false)
    }
  }, [built.phase, restoring, restoreSlot])

  const phase: MissionLabPhase =
    built.phase === 'failed' ? 'failed' : built.phase !== 'ready' ? 'building' : restoring ? 'restoring' : 'ready'

  return { phase, errors: built.errors, startOver }
}
