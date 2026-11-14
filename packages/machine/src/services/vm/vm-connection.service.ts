import type { Validated } from '@dicomfall/core/types'
import { proxy, type Remote, wrap } from 'comlink'
import { getMachineConfig } from '#config'
import { readMachineFile } from '#services/vm/vm-read.service'
import type { MachineEndpoint } from '#types/definitions/endpoint'
import type { LinkDefinition, NetworkDefinition } from '#types/definitions/network'
import type { ControlReply, VmEventUpdate, VmSession, VmShellUpdate, VmStatus } from '#types/definitions/vm'

interface VmConnection {
  readonly endpoint: MachineEndpoint
  readonly session: Remote<VmSession>
}

let connection: VmConnection | null = null
/** Mounted users; the VM stops when the last one leaves. */
let users = 0
const outputListeners = new Set<(bytes: Uint8Array) => void>()
/** The network each running VM was last set up for. */
const networkKeys = new WeakMap<VmConnection, string>()
let terminalSize: { rows: number; cols: number } | null = null

const NOT_RUNNING_ERROR = 'The Machine is not running'
const NOT_RUNNING: Validated<null> = { ok: false, errors: [NOT_RUNNING_ERROR] }

/** The first user starts the VM in its worker. */
export function connectVm(
  onStatus: (status: VmStatus) => void,
  onEvents: (update: VmEventUpdate) => void,
  onShell: (update: VmShellUpdate) => void = () => {}
): { started: boolean } {
  users++
  if (connection !== null) {
    return { started: false }
  }
  const config = getMachineConfig()
  const endpoint = config.createVmEndpoint()
  const started: VmConnection = { endpoint, session: wrap<VmSession>(endpoint) }
  connection = started
  void started.session.start(
    { baseUrl: config.vmBaseUrl, ...(config.vmWasmUrl === null ? {} : { wasmUrl: config.vmWasmUrl }) },
    proxy((bytes: Uint8Array) => {
      for (const listener of [...outputListeners]) {
        listener(bytes)
      }
    }),
    proxy((status: VmStatus) => {
      // A status from a VM that was stopped and replaced is stale.
      if (connection === started) {
        onStatus(status)
      }
    }),
    proxy((update: VmEventUpdate) => {
      if (connection === started) {
        onEvents(update)
      }
    }),
    proxy((update: VmShellUpdate) => {
      if (connection === started) {
        onShell(update)
      }
    })
  )
  if (terminalSize) {
    void started.session.resizeTerminal(terminalSize.rows, terminalSize.cols)
  }
  return { started: true }
}

/** Removes a user. True when this call stopped the VM. */
export function disconnectVm(): { stopped: boolean } {
  users = Math.max(0, users - 1)
  if (users > 0 || connection === null) {
    return { stopped: false }
  }
  const closed = connection
  connection = null
  void closed.session.stop().finally(() => closed.endpoint.terminate())
  return { stopped: true }
}

/** Keys typed at the console; dropped while no VM runs. */
export function sendToVm(text: string): void {
  void connection?.session.input(text)
}

/** Every console byte from now on; returns the unsubscribe. */
export function onVmOutput(listener: (bytes: Uint8Array) => void): () => void {
  outputListeners.add(listener)
  return () => {
    outputListeners.delete(listener)
  }
}

/** The console's size, for this VM and any started later. */
export function resizeVmTerminal(rows: number, cols: number): void {
  terminalSize = { rows, cols }
  void connection?.session.resizeTerminal(rows, cols)
}

/**
 * Builds a mission's lab on the clean Machine. Once per `key` per VM, so coming back to the same
 * mission's screen keeps the lab as the player left it; `null` when it was already built.
 * `onStart` runs only when the build really begins.
 */
export async function setupVmNetwork(
  key: string,
  network: NetworkDefinition,
  onStart?: () => void
): Promise<Validated<null> | null> {
  const running = connection
  if (!running) {
    return NOT_RUNNING
  }
  if (networkKeys.get(running) === key) {
    return null
  }
  networkKeys.set(running, key)
  onStart?.()
  const built = await running.session.setupNetwork(network)
  if (!built.ok) {
    // A failed build may be tried again.
    networkKeys.delete(running)
  }
  return built
}

/** Runs a line as root on the Machine; null while no VM runs. */
export async function runVmControl(line: string, timeoutMs?: number): Promise<ControlReply | null> {
  const running = connection
  return running ? running.session.control(line, timeoutMs) : null
}

/** A file's bytes as root reads them, for a check; fails with why it could not be read. */
export async function readVmFile(path: string): Promise<Validated<Uint8Array>> {
  const running = connection
  if (!running) {
    return { ok: false, errors: [NOT_RUNNING_ERROR] }
  }
  return readMachineFile((line, timeoutMs) => running.session.control(line, timeoutMs), path)
}

/** Starts losing a share of a link's packets, or stops at 0; false when it could not. */
export async function setVmLinkLoss(link: LinkDefinition, lossPercent: number): Promise<boolean> {
  const running = connection
  return running ? running.session.setLinkLoss(link, lossPercent) : false
}

/** Keeps the Machine as it is now, to come back to; false when it could not. */
export async function saveVmSlot(slot?: string): Promise<boolean> {
  const running = connection
  return running ? running.session.saveSlot(slot) : false
}

/** Back to the saved Machine; false when none was saved. */
export async function restoreVmSlot(slot?: string): Promise<boolean> {
  const running = connection
  return running ? running.session.restoreSlot(slot) : false
}

/** Moves the console into an AE; false while no VM runs. */
export async function selectVmAe(ae: string | null): Promise<boolean> {
  const running = connection
  if (!running) {
    return false
  }
  await running.session.selectAe(ae)
  return true
}
