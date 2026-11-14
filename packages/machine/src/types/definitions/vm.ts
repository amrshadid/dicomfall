import type { Validated } from '@dicomfall/core/types'
import type { StampedMachineEvent } from '#types/definitions/event'
import type { LinkDefinition, NetworkDefinition } from '#types/definitions/network'

/** What the VM emulates: Linux and a few go-dicom processes with room to spare. */
export const VM_MEMORY_BYTES = 256 * 1024 * 1024

/** `quiet` keeps the kernel's boot log off the player's console. */
export const VM_CMDLINE = 'console=ttyS0 rw tsc=reliable mitigations=off random.trust_cpu=on quiet'

export const VM_HOSTNAME = 'dicomfall'

/** Root's control channel prints this once it is listening. */
export const VM_CONTROL_READY = '__DF_READY__'

/** Root's control channel prints this and the exit status after each line it ran. */
export const VM_CONTROL_DONE = '__DF_DONE__'

/** A control line slower than this is stuck. */
export const VM_CONTROL_TIMEOUT_MS = 60_000

/** One AE's namespace, its links and its files. */
export const VM_SETUP_TIMEOUT_MS = 120_000

/** COM2: the Machine's news, one line each, for the event stream. */
export const VM_EVENT_TTY = '/dev/ttyS1'

/** The AE whose namespace the console's next shell starts in; empty or missing for none. */
export const VM_AE_FILE = '/run/df-ae'
/** The console's shell: killing it makes init start the next one. */
export const VM_SHELL_PID_FILE = '/run/df-shell.pid'
export const VM_SHELL = '/usr/libexec/df-shell'
export const VM_BASHRC = '/etc/df-bashrc'

/** Where `pnpm vm:image` installs go-dicom when the image lock pins it. */
export const VM_GO_DICOM = '/usr/local/bin/go-dicom'

/** bash's prompt on the console: `dicomfall:~# `, or `workstation:~# ` in the AE workstation. */
export const VM_PROMPT = /[a-z][a-z0-9-]*:[^\n]*# $/

/** Where a saved Machine is kept when no name is given: the mission's start. */
export const VM_DEFAULT_SLOT = 'start'

export const VM_OUTPUT_FLUSH_MS = 16
/** A 9p read still in flight is lost from a saved state: it is saved after this much quiet. */
export const VM_SAVE_DELAY_MS = 1_000
/** v86 applies a state just after it is asked to: a key or a line sent sooner is lost. */
export const VM_RESTORE_SETTLE_MS = 300
export const VM_RESIZE_SETTLE_MS = 150

/** The largest file root reads for a check: base64 over the control channel, so it costs a third more. */
export const VM_READ_MAX_BYTES = 8 * 1024 * 1024

/** Content-addressed image files, so a cached one never goes stale. */
export const VM_FILE_CACHE = 'dicomfall-vm-files-v1'
export const VM_STATE_DB = 'dicomfall-vm'
export const VM_STATE_STORE = 'boots'

/** What `manifest.json` says about the built image. */
export interface VmManifest {
  /** Changes whenever the image or its command line does, so a cached image never goes stale. */
  readonly version: string
  readonly kernelRelease: string
  /** The go-dicom release in the image; null while the image lock pins none. */
  readonly goDicomVersion: string | null
}

export type VmPhase = 'off' | 'loading' | 'booting' | 'restoring' | 'setting-up' | 'ready' | 'failed'

export interface VmStatus {
  readonly phase: VmPhase
  /** Why it failed. */
  readonly detail: string | null
}

export interface VmStartOptions {
  /** Where the image is served from, ending in `/`. */
  readonly baseUrl: string
  /** The emulator's wasm; the worker passes its own. */
  readonly wasmUrl?: string
  /** Boot from the kernel even if a boot is saved for this image (tests, the recorder). */
  readonly fresh?: boolean
}

/** A control line's exit status and everything it printed (stdout and stderr) before it. */
export interface ControlReply {
  readonly status: number
  readonly output: string
}

/**
 * News from the event stream. `from` is where `events` start in it: less than what the listener
 * holds when the Machine went back to an earlier moment (a restore, a new network), and everything
 * from there on is replaced.
 */
export interface VmEventUpdate {
  readonly from: number
  readonly events: readonly StampedMachineEvent[]
}

/**
 * The player's console as the Machine sees it, sent whenever either part changes: the AE its
 * shell is in, and how many commands the player has finished there since the Machine started.
 */
export interface VmShellUpdate {
  /** The AE the console's shell is in; null for the Machine itself. */
  readonly ae: string | null
  /**
   * Counts each return to a prompt after the player pressed Enter: a command line that ran.
   * Never goes back, not even on a restore.
   */
  readonly commandsFinished: number
  /**
   * The command lines of the commands this update finished, oldest first: each as the console
   * showed it when Enter reached it, readline's redraws applied and the prompt included
   * (`workstation:~# ls -l /lab`); `''` for one whose line never showed. Left out when the update
   * finished none.
   */
  readonly lines?: readonly string[]
}

/** One Linux VM: the console goes out as bytes, keys come in as text, root has a channel of its own. */
export interface VmSession {
  start(
    options: VmStartOptions,
    onOutput: (bytes: Uint8Array) => void,
    onStatus: (status: VmStatus) => void,
    onEvents?: (update: VmEventUpdate) => void,
    onShell?: (update: VmShellUpdate) => void
  ): Promise<void>
  /** Keys for the console. Held while the Machine is being set up or restored. */
  input(text: string): void
  resizeTerminal(rows: number, cols: number): void
  /** Back to the clean boot, then the network built on it. Fails with the line that failed and what it printed. */
  setupNetwork(network: NetworkDefinition): Promise<Validated<null>>
  /** Runs a line as root, apart from the player's console: a check, a report. */
  control(line: string, timeoutMs?: number): Promise<ControlReply>
  /**
   * Starts losing `lossPercent` of the packets on a link, both ways, or stops when it is 0. Its
   * interfaces stay up. False when the link is not in the network or the loss is out of range.
   */
  setLinkLoss(link: LinkDefinition, lossPercent: number): Promise<boolean>
  /**
   * Keeps the Machine as it is now, to come back to, under a name: a mission's lab as it was first
   * built, or as the player left it. A new network forgets them all.
   */
  saveSlot(slot?: string): Promise<boolean>
  /** Back to a saved Machine, at the moment it was saved; false when none was saved under that name. */
  restoreSlot(slot?: string): Promise<boolean>
  /** The console's shell moves into this AE's namespace; `null` for the Machine itself. */
  selectAe(ae: string | null): Promise<void>
  stop(): Promise<void>
}
