// @vitest-environment jsdom
import { useAppStore } from '@app/store'
import type { VmStatus } from '@dicomfall/machine/types'
import type { TerminalViewOptions } from '@features/terminal/hooks/view'
import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TerminalContainer } from './TerminalContainer'

const mocks = vi.hoisted(() => ({
  status: { phase: 'loading', detail: null } as unknown,
  onOutput: null as ((bytes: Uint8Array) => void) | null,
  options: null as unknown,
  send: vi.fn(),
  resize: vi.fn(),
  write: vi.fn(),
  focus: vi.fn(),
  clear: vi.fn(),
}))

vi.mock('@dicomfall/machine/hooks', () => ({
  useLinuxTerminal: (onOutput: (bytes: Uint8Array) => void) => {
    mocks.onOutput = onOutput
    return { ...(mocks.status as VmStatus), send: mocks.send }
  },
  useTerminalSize: () => ({ resize: mocks.resize }),
  useMachineStatus: () => mocks.status,
}))

// Stable across renders, as the real view is.
const view = { write: mocks.write, focus: mocks.focus, clear: mocks.clear }
vi.mock('@features/terminal/hooks/view', () => ({
  useTerminalView: (_container: unknown, options: TerminalViewOptions) => {
    mocks.options = options
    return view
  },
}))

const options = () => mocks.options as TerminalViewOptions

const at = (phase: VmStatus['phase'], detail: string | null = null) => {
  mocks.status = { phase, detail }
}

beforeEach(() => at('loading'))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('TerminalContainer', () => {
  it('joins the console to the Machine: keys go in, bytes come out, the size follows', () => {
    at('ready')
    render(<TerminalContainer />)
    options().onInput('ls /lab\r')
    options().onResize(30, 100)
    expect(mocks.send).toHaveBeenCalledWith('ls /lab\r')
    expect(mocks.resize).toHaveBeenCalledWith(30, 100)
    mocks.onOutput?.(new TextEncoder().encode('total 10\r\n'))
    expect(mocks.write).toHaveBeenCalledWith('total 10\r\n')
  })

  it("says in one dim line that the console moved into an AE, in place of the Machine's bare prompt", () => {
    at('ready')
    render(<TerminalContainer />)
    mocks.onOutput?.(new TextEncoder().encode('dicomfall:~# '))
    expect(mocks.write).not.toHaveBeenCalledWith(expect.stringContaining('dicomfall:~#'))
    mocks.onOutput?.(new TextEncoder().encode('\r\nworkstation:~# '))
    expect(mocks.write).toHaveBeenCalledWith('\x1b[2mConsole moved into AE workstation\x1b[0m\r\nworkstation:~# ')
  })

  it("shows the Machine's prompt after all when no AE's prompt follows the built lab", () => {
    vi.useFakeTimers()
    try {
      at('ready')
      render(<TerminalContainer />)
      mocks.onOutput?.(new TextEncoder().encode('dicomfall:~# '))
      act(() => vi.advanceTimersByTime(6000))
      expect(mocks.write).toHaveBeenCalledWith('dicomfall:~# ')
    } finally {
      vi.useRealTimers()
    }
  })

  it.each([
    ['loading', 'Loading the Machine'],
    ['booting', 'Booting Linux'],
    ['setting-up', 'Building the lab'],
  ] as const)('is locked, with a plate that says why, while the Machine is %s', (phase, title) => {
    at(phase)
    render(<TerminalContainer />)
    expect(options().locked).toBe(true)
    expect(screen.getByRole('status').textContent).toContain(title)
    expect(mocks.write).toHaveBeenCalledWith(expect.stringContaining('…'))
  })

  it('opens once the shell is at its prompt', () => {
    at('ready')
    render(<TerminalContainer />)
    expect(options().locked).toBe(false)
    expect(screen.queryByRole('status')).toBeNull()
    expect(mocks.write).not.toHaveBeenCalled()
  })

  it("stays locked while the mission's lab is built, though the Machine is ready", () => {
    at('ready')
    const { rerender } = render(<TerminalContainer building />)
    expect(options().locked).toBe(true)
    expect(screen.getByRole('status').textContent).toContain('Building the lab')

    rerender(<TerminalContainer building={false} />)
    expect(options().locked).toBe(false)
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('keeps the plate but lets keys through while a lab that was up is restored: the Machine holds them', () => {
    at('ready')
    const { rerender } = render(<TerminalContainer />)
    at('restoring')
    rerender(<TerminalContainer />)
    expect(screen.getByRole('status').textContent).toContain('Restoring the Machine')
    expect(options().locked).toBe(false)
  })

  it.each(['restoring', 'setting-up'] as const)(
    'clears the old shell off the screen when a running Machine starts over (%s)',
    (phase) => {
      at('ready')
      const { rerender } = render(<TerminalContainer />)
      expect(mocks.clear).not.toHaveBeenCalled()
      at(phase)
      rerender(<TerminalContainer />)
      expect(mocks.clear).toHaveBeenCalledTimes(1)
      // Once: the restored shell's own prompt is not cleared away when it comes back.
      at('ready')
      rerender(<TerminalContainer />)
      expect(mocks.clear).toHaveBeenCalledTimes(1)
    }
  )

  it('keeps what the Machine printed while it started', () => {
    at('loading')
    const { rerender } = render(<TerminalContainer />)
    at('booting')
    rerender(<TerminalContainer />)
    at('ready')
    rerender(<TerminalContainer />)
    expect(mocks.clear).not.toHaveBeenCalled()
  })

  it('says why the Machine failed, on the plate and in the console', () => {
    at('failed', 'No Linux image at /vm/')
    render(<TerminalContainer />)
    expect(screen.getByRole('alert').textContent).toContain('No Linux image at /vm/')
    expect(mocks.write).toHaveBeenCalledWith(expect.stringContaining('could not start: No Linux image at /vm/'))
    expect(options().locked).toBe(true)
  })

  it('takes focus on the Console shortcut', () => {
    at('ready')
    render(<TerminalContainer />)
    act(() => useAppStore.getState().shortcutHandlers['focus-terminal']?.())
    expect(mocks.focus).toHaveBeenCalledTimes(1)
  })
})
