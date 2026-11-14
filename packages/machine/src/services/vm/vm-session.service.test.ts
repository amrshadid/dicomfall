import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { saveVmState } from '#services/vm/vm-state.service'
import { fakeIndexedDb } from '#test/fake-indexed-db'
import { TWO_AES, TWO_AES_LINK } from '#test/lab'
import { VM_AE_FILE, VM_CONTROL_DONE, type VmShellUpdate } from '#types/definitions/vm'

type Listener = (byte: number) => void

/** The guest as far as the session sees it: which namespace the console's shell is in. */
const guest = { shellAe: '', lines: [] as string[] }

// A stand-in for v86: root's channel answers every line, and a killed shell comes back in the
// AE written to the AE file. A saved state is the shell's AE, so a restore puts it back.
class FakeV86 {
  readonly #listeners = new Map<string, Listener[]>()

  constructor() {
    setTimeout(() => this.#emit('emulator-ready', 0), 0)
  }

  add_listener(name: string, listener: Listener) {
    this.#listeners.set(name, [...(this.#listeners.get(name) ?? []), listener])
  }

  serial_send_bytes(_port: number, bytes: Uint8Array) {
    const line = new TextDecoder().decode(bytes).trim()
    guest.lines.push(line)
    const written = new RegExp(`^echo (\\S*) > ${VM_AE_FILE}$`).exec(line)
    if (written) {
      guest.shellAe = written[1] ?? ''
    }
    setTimeout(() => {
      if (line.startsWith('kill -9')) {
        this.#send('serial0-output-byte', `\r\n${guest.shellAe || 'dicomfall'}:~# `)
      }
      this.#send('serial2-output-byte', `${VM_CONTROL_DONE} 0\n`)
    }, 1)
  }

  serial0_send(_text: string) {}

  async save_state(): Promise<ArrayBuffer> {
    return new TextEncoder().encode(guest.shellAe).buffer
  }

  async restore_state(state: ArrayBuffer) {
    guest.shellAe = new TextDecoder().decode(state)
  }

  async destroy() {}

  #emit(name: string, byte: number) {
    for (const listener of this.#listeners.get(name) ?? []) {
      listener(byte)
    }
  }

  #send(name: string, text: string) {
    for (const char of text) {
      this.#emit(name, char.charCodeAt(0))
    }
  }
}

vi.mock('v86', () => ({ V86: FakeV86 }))

const { createVmSession } = await import('#services/vm/vm-session.service')

/** Lets the Machine's waits run out: v86 settling, the save delay, the shell's prompt. */
async function done<T>(work: Promise<T>): Promise<T> {
  await vi.advanceTimersByTimeAsync(5_000)
  return work
}

async function startedSession() {
  const shell: VmShellUpdate[] = []
  const session = createVmSession('v86.wasm')
  await done(
    session.start(
      { baseUrl: '/vm/' },
      () => {},
      () => {},
      () => {},
      (update) => shell.push(update)
    )
  )
  await vi.advanceTimersByTimeAsync(1_000)
  expect(await done(session.setupNetwork(TWO_AES))).toEqual({ ok: true, value: null })
  return { session, shell }
}

describe('the session', () => {
  beforeEach(async () => {
    vi.stubGlobal('indexedDB', fakeIndexedDb())
    vi.stubGlobal('fetch', async () => ({ ok: true, json: async () => ({ version: 'image' }) }))
    // A saved boot, so the session restores it instead of booting Linux.
    await saveVmState('image', new ArrayBuffer(0))
    vi.useFakeTimers()
    guest.shellAe = ''
    guest.lines = []
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('moves the shell back to the AE picked since the save, and only ever reports that one', async () => {
    const { session, shell } = await startedSession()
    await done(session.selectAe('workstation'))
    expect(await done(session.saveSlot())).toBe(true)
    await done(session.selectAe('archive'))
    shell.length = 0

    expect(await done(session.restoreSlot())).toBe(true)

    expect(guest.shellAe).toBe('archive')
    expect(shell.at(-1)?.ae).toBe('archive')
    // The saved Machine's shell was in workstation: the store never hears it.
    expect(shell.map((update) => update.ae)).not.toContain('workstation')
  })

  it('reports the AE once when the shell was saved where it is now', async () => {
    const { session, shell } = await startedSession()
    await done(session.selectAe('archive'))
    await done(session.saveSlot())
    shell.length = 0
    guest.lines = []

    await done(session.restoreSlot())

    expect(shell.map((update) => update.ae)).toEqual(['archive'])
    expect(guest.lines.some((line) => line.startsWith('kill -9'))).toBe(false)
  })

  it('never sends the shell into an AE the network does not have', async () => {
    const { session } = await startedSession()
    guest.lines = []
    await done(session.selectAe('viewer'))
    await done(session.selectAe('Not An AE'))
    expect(guest.lines).toEqual([])
  })

  it('says no to a restore of a slot never saved', async () => {
    const { session } = await startedSession()
    expect(await done(session.restoreSlot('elsewhere'))).toBe(false)
  })

  it('sets a link’s loss only on a link the network has, and within range', async () => {
    const { session } = await startedSession()
    guest.lines = []
    expect(await done(session.setLinkLoss(TWO_AES_LINK, 30))).toBe(true)
    expect(await done(session.setLinkLoss(['workstation', 'viewer'], 30))).toBe(false)
    expect(await done(session.setLinkLoss(TWO_AES_LINK, 101))).toBe(false)
    expect(guest.lines).toHaveLength(1)
    expect(guest.lines[0]).toContain('netem loss 30%')
  })
})
