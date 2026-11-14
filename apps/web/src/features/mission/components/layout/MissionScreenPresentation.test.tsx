// @vitest-environment jsdom
import type { MissionLayoutModel } from '@features/mission/types'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { MISSION_LAYOUT } from '@/test/fixtures/mission-layout.fixture'
import { MissionScreenPresentation } from './MissionScreenPresentation'

beforeAll(() => {
  // jsdom has no modal dialogs; the layout only needs them to open and close.
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.open = true
  }
  HTMLDialogElement.prototype.close = function close() {
    this.open = false
  }
})

afterEach(cleanup)

const layout = (overrides: Partial<MissionLayoutModel> = {}) =>
  render(<MissionScreenPresentation unavailable={null} layout={{ ...MISSION_LAYOUT, ...overrides }} />)

describe('MissionScreenPresentation', () => {
  it('puts every slot in its column: the Guide, the Bench (Console over Inspector), the Lightbox', () => {
    layout()
    expect(within(screen.getByRole('complementary', { name: 'Guide' })).getByText('guide slot')).toBeTruthy()
    const bench = screen.getByRole('region', { name: 'Bench' })
    expect(within(bench).getByText('inspector slot')).toBeTruthy()
    expect(within(screen.getByRole('region', { name: 'Console' })).getByText('terminal slot')).toBeTruthy()
    expect(document.getElementById('mission-preview')?.textContent).toBe('preview slot')
    expect(document.getElementById('mission-uids')?.textContent).toBe('uids slot')
    expect(document.getElementById('mission-timeline')?.textContent).toBe('timeline slot')
    expect(document.getElementById('mission-lightbox')?.textContent).toContain('1 AE, 0 links')
  })

  it('names the mission in the one h1, with its steps beside it', () => {
    layout()
    expect(screen.getByRole('heading', { level: 1, name: 'The Four Regions' })).toBeTruthy()
    expect(within(screen.getByRole('list', { name: 'Mission steps' })).getAllByRole('listitem')).toHaveLength(5)
  })

  it("doesn't draw a panel the mission hasn't opened, or the dividers that would resize it", () => {
    layout({ panels: { inspector: false, lightbox: false } })
    expect(screen.queryByText('inspector slot')).toBeNull()
    expect(screen.queryByText('preview slot')).toBeNull()
    expect(screen.queryByText('timeline slot')).toBeNull()
    expect(screen.getAllByRole('separator').map((splitter) => splitter.getAttribute('aria-label'))).toEqual([
      'Resize the Guide',
    ])
    expect(screen.getByText('terminal slot')).toBeTruthy()
  })

  it('opens the Lightbox before the Inspector, with its own divider', () => {
    layout({ panels: { inspector: false, lightbox: true } })
    expect(screen.getByText('timeline slot')).toBeTruthy()
    expect(screen.queryByText('inspector slot')).toBeNull()
    expect(screen.getByRole('separator', { name: 'Resize the Lightbox' })).toBeTruthy()
    expect(screen.queryByRole('separator', { name: 'Resize the Console and the Inspector' })).toBeNull()
  })

  it('resizes a panel from the keyboard, and puts its default back on a double-click', () => {
    const onResize = vi.fn()
    layout({ panelSizes: { sizes: { guide: 20, lightbox: null, bench: null }, onResize } })
    const splitter = screen.getByRole('separator', { name: 'Resize the Guide' })
    expect(splitter.getAttribute('aria-valuenow')).toBe('20')
    fireEvent.keyDown(splitter, { key: 'End' })
    expect(onResize).toHaveBeenLastCalledWith('guide', 34)
    fireEvent.doubleClick(splitter)
    expect(onResize).toHaveBeenLastCalledWith('guide', null)
  })

  it('says whose shell the Console is, or what the Machine is doing instead', () => {
    layout()
    expect(within(screen.getByRole('region', { name: 'Console' })).getByRole('status').textContent).toBe(
      'AE workstation'
    )
    cleanup()
    layout({ terminalStatus: 'Building the lab' })
    expect(within(screen.getByRole('region', { name: 'Console' })).getByRole('status').textContent).toBe(
      'Building the lab'
    )
  })

  it('lays the debrief over the Bench and the Lightbox, and takes them out of reach', () => {
    layout({ debrief: <p>debrief slot</p> })
    expect(screen.getByText('debrief slot')).toBeTruthy()
    expect(document.getElementById('mission-bench')?.hasAttribute('inert')).toBe(true)
    expect(document.getElementById('mission-lightbox')?.hasAttribute('inert')).toBe(true)
    // The Guide stays in reach: it holds the way on.
    expect(document.getElementById('mission-guide')?.hasAttribute('inert')).toBe(false)
  })

  it("asks before it replays the mission from the top bar, in Kernelfall's words", () => {
    const onReplay = vi.fn()
    const onConfirm = vi.fn()
    layout({
      bar: { ...MISSION_LAYOUT.bar, onReplay },
      replay: { open: true, onConfirm, onCancel: () => {} },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Replay this mission' }))
    expect(onReplay).toHaveBeenCalledTimes(1)
    const dialog = screen.getByRole('dialog', { name: 'Replay this mission?' })
    expect(dialog.textContent).toContain(
      "starts again from its scene, on the lab as the mission found it: this play-through's steps and hints are dropped"
    )
    expect(within(dialog).getByRole('button', { name: 'Keep playing' })).toBeTruthy()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Replay from the scene' }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it("asks before the Guide's Start over resets the lab, keeping the play-through", () => {
    const onConfirm = vi.fn()
    layout({ restart: { open: true, onConfirm, onCancel: () => {} } })
    const dialog = screen.getByRole('dialog', { name: 'Start this mission again?' })
    expect(dialog.textContent).toContain('the hints you asked for are kept')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Start again' }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('shows where the Machine is in the status bar, and opens the shortcuts from it', () => {
    const onShortcuts = vi.fn()
    layout({ status: { ...MISSION_LAYOUT.status, machine: 'Lab: building', onShortcuts } })
    expect(screen.getByText('Lab: building')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Shortcuts ?' }))
    expect(onShortcuts).toHaveBeenCalledTimes(1)
  })

  it("gives a mission that can't be played a plain reason and a way back, never a dead end", () => {
    render(
      <MissionScreenPresentation layout={null} unavailable={{ reason: 'It is still being built.', titleHref: '#/' }} />
    )
    expect(screen.getByRole('heading', { level: 1, name: "This mission can't be played yet." })).toBeTruthy()
    expect(screen.getByText('It is still being built.')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Back to the title' }).getAttribute('href')).toBe('#/')
  })

  it('draws nothing while the mission is being opened', () => {
    const { container } = render(<MissionScreenPresentation layout={null} unavailable={null} />)
    expect(container.innerHTML).toBe('')
  })
})
