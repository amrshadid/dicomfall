import type { LabDefinition } from '@dicomfall/game/types'
import { VM_GO_DICOM } from '@dicomfall/machine/types'

/** What the booted image can run, found once before the first mission. */
export interface MachineAbilities {
  readonly goDicom: boolean
}

// go-dicom as a word of the shell line: at its start, after a separator or a subshell, before its arguments.
const GO_DICOM_WORD = /(?:^|[\s;&|(`])(?:\/usr\/local\/bin\/)?go-dicom(?=$|[\s;&|)`])/

/** True when the line runs go-dicom anywhere in it, in a pipe or a list. */
export const needsGoDicom = (command: string): boolean => GO_DICOM_WORD.test(command)

const NO_GO_DICOM = `which is not in this image (${VM_GO_DICOM})`

/** Why a block's command cannot be recorded on this image; null when it can. */
export function skipReason(command: string, abilities: MachineAbilities): string | null {
  return needsGoDicom(command) && !abilities.goDicom ? `it runs go-dicom, ${NO_GO_DICOM}` : null
}

/**
 * Why none of a mission's blocks can be recorded on this image; null when they can. A lab whose
 * services cannot start is not the lab the story describes, so nothing recorded in it would be true.
 */
export function labSkipReason(lab: LabDefinition, abilities: MachineAbilities): string | null {
  const blocked = lab.aes.find((ae) => ae.start.some((line) => needsGoDicom(line)))
  return blocked && !abilities.goDicom ? `the lab starts go-dicom in ${blocked.name}, ${NO_GO_DICOM}` : null
}
