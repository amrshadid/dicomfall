import type { LabDefinition } from '@dicomfall/game/types'
import type { NetworkDefinition } from '@dicomfall/machine/types'
import { inAe } from '@dicomfall/machine/utils'

/** The Machine's network for a mission's lab: its AEs, links and files. `start` is run apart: the Machine has no field for it. */
export function labNetwork(lab: LabDefinition): NetworkDefinition {
  return {
    aes: lab.aes.map(({ name, title, address }) => ({ name, title, ...(address !== undefined && { address }) })),
    links: lab.links,
    files: lab.files,
  }
}

/** Where a `start` command's output goes: the AE's log, never the console (MISSIONS.md, The lab). */
export const startLogOf = (ae: string): string => `/var/log/df-start-${ae}.log`

/**
 * Root's line that starts one of an AE's `start` commands in the background, in its namespace,
 * its output in the AE's log. null for a command that a single-quoted shell word cannot hold.
 */
export function startLine(ae: string, command: string): string | null {
  if (command.includes("'")) {
    return null
  }
  return `(${inAe(ae, command)}) >> ${startLogOf(ae)} 2>&1 < /dev/null &`
}

/** The port a `start` command listens on (`-port 11112`, `--port=11112`), to know when the lab has settled. */
export function startPort(command: string): number | null {
  const port = /(?:^|\s)--?port[=\s]+(\d{1,5})\b/.exec(command)?.[1]
  return port === undefined ? null : Number(port)
}
