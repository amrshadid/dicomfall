// @vitest-environment jsdom
import { appContent } from '@dicomfall/missions/utils'
import { journeyChapters } from '@features/map'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { TitlePresentation, type TitlePresentationProps } from './TitlePresentation'

beforeAll(() => {
  // The map figure sizes itself to its box; jsdom has no layout to observe.
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    }
  )
  // jsdom has no modal dialogs; the screen only needs them to open and close.
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.open = true
  }
  HTMLDialogElement.prototype.close = function close() {
    this.open = false
  }
})

afterEach(cleanup)

const loaded = appContent()
if (!loaded.ok) {
  throw new Error(loaded.errors.join('\n'))
}
const { game } = loaded.value
const chapters = game.chapters.map((chapter) => ({
  chapter,
  missions: game
    .missionsIn(chapter.id)
    .map((mission) => ({ mission, status: 'available' as const, attempts: 0, hintsUsed: 0 })),
}))

function title(overrides: Partial<TitlePresentationProps> = {}) {
  const props: TitlePresentationProps = {
    chrome: { themeLabel: 'Night print', onToggleTheme: vi.fn(), storageIssue: null, onExport: vi.fn(), onTour: null },
    volume: 'Stage 1: The first file',
    continueTo: null,
    firstMission: { where: 'Start at The Preamble.', step: 'One sentence.' },
    onNewGame: vi.fn(),
    contents: [
      { id: 'new', name: 'New game', reference: 'from The Preamble', onSelect: vi.fn() },
      { id: 'map', name: 'Archive Map', reference: 'Stage 1, 0 of 1 passed', href: '#/map' },
      { id: 'settings', name: 'Settings', reference: 'theme, motion, saves', href: '#/settings' },
    ],
    figure: { chapters: journeyChapters(chapters, game.missions[0] ?? null), href: '#/map' },
    newGame: { open: false, onExportAndStart: vi.fn(), onStart: vi.fn(), onCancel: vi.fn() },
    saveText: 'Saved just now',
    onShortcuts: vi.fn(),
    privacyHref: '#/settings/privacy',
    ...overrides,
  }
  render(<TitlePresentation {...props} />)
  return props
}

describe('TitlePresentation', () => {
  it("names the game in the page's one h1 and the stage in the running head", () => {
    title()
    expect(screen.getByRole('heading', { level: 1, name: 'DICOMFall' })).toBeTruthy()
    expect(screen.getByText('Imaging Manual · Stage 1: The first file')).toBeTruthy()
  })

  it('makes New game the primary action on a first visit, with where it starts', () => {
    const { onNewGame } = title()
    const button = screen.getByRole('button', { name: 'New game' })
    expect(button.hasAttribute('data-primary')).toBe(true)
    expect(screen.getByText('Start at The Preamble.')).toBeTruthy()
    fireEvent.click(button)
    expect(onNewGame).toHaveBeenCalledTimes(1)
  })

  it('makes Continue the primary action once there is a game, with where and how far', () => {
    title({
      continueTo: {
        href: '#/mission/the-preamble',
        where: 'Stage 1 · The first file · The Preamble',
        step: 'In progress · last played just now',
      },
    })
    const link = screen.getByRole('link', { name: 'Continue' })
    expect(link.getAttribute('href')).toBe('#/mission/the-preamble')
    expect(link.hasAttribute('data-primary')).toBe(true)
    expect(screen.getByText('In progress · last played just now')).toBeTruthy()
  })

  it('lists New game, the Archive Map and Settings in the contents', () => {
    title()
    const contents = within(screen.getByRole('navigation', { name: 'Main menu' })).getByRole('list', {
      name: 'Contents',
    })
    expect(
      within(contents)
        .getAllByRole('listitem')
        .map((item) => item.textContent)
    ).toEqual(['New gamefrom The Preamble', 'Archive MapStage 1, 0 of 1 passed', 'Settingstheme, motion, saves'])
  })

  it('links the source from the quote, and says what the game teaches', () => {
    title()
    expect(screen.getByText('Andrew S. Tanenbaum, Computer Networks, 1981')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'is that you have so many to choose from.' }).getAttribute('href')).toBe(
      'https://github.com/amrshadid/dicomfall'
    )
    expect(screen.getByText(/Learn DICOM from the first byte to the network\./)).toBeTruthy()
  })

  it('shows the map around the player as Fig. 1, linked to the whole map', () => {
    title()
    expect(screen.getByText(/^Fig\. 1\. The Archive Map around you/)).toBeTruthy()
    expect(document.querySelector('.title__drawing a')?.getAttribute('href')).toBe('#/map')
  })

  it('says how the game is saved, links Privacy and opens the shortcuts', () => {
    const { onShortcuts } = title()
    expect(screen.getByText('Saved just now')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Privacy' }).getAttribute('href')).toBe('#/settings/privacy')
    fireEvent.click(screen.getByRole('button', { name: /^Shortcuts/ }))
    expect(onShortcuts).toHaveBeenCalledTimes(1)
  })

  it('asks before a new game replaces the current one, offering an export first', () => {
    const { newGame } = title({
      newGame: { open: true, onExportAndStart: vi.fn(), onStart: vi.fn(), onCancel: vi.fn() },
    })
    const dialog = screen.getByRole('dialog', { name: 'Start a new game?' })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Export and start over' }))
    expect(newGame.onExportAndStart).toHaveBeenCalledTimes(1)
    fireEvent.click(within(dialog).getByRole('button', { name: 'Start over' }))
    expect(newGame.onStart).toHaveBeenCalledTimes(1)
  })
})
