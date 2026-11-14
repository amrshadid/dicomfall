import type { LabPath, MissionDefinition } from '@dicomfall/game/types'

/**
 * The files the File inspector can open: each fixture the lab copies to a file of its own. A
 * fixture copied as a folder (`series/`) is left out: its files are the player's to find.
 */
export function labFilesOf(mission: Pick<MissionDefinition, 'lab'>): readonly LabPath[] {
  return [...new Set(mission.lab.files.map((file) => file.to).filter((to) => !to.endsWith('/')))]
}

/**
 * The file the inspector opens first: the one the mission's first file objective is about, so a
 * capstone on its second file opens there; else the lab's first.
 */
export function defaultFileOf(
  mission: Pick<MissionDefinition, 'objectives'>,
  files: readonly LabPath[]
): LabPath | null {
  for (const { check } of mission.objectives) {
    if ('file' in check && typeof check.file === 'string' && files.includes(check.file)) {
      return check.file
    }
  }
  return files[0] ?? null
}
