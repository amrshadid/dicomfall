// @vitest-environment jsdom

import type { MapView } from '@features/map/types'
import { EMPTY_DETAIL, mapDetailOf } from '@features/map/utils/detail'
import {
  FIRST_MISSION,
  JOURNEY_SKILLS,
  journeyFixture,
  longerJourneyFixture,
  SECOND_MISSION,
} from '@features/map/utils/fixtures'
import { journeyChapters, journeyMarks, journeySummary } from '@features/map/utils/journey'
import { mapNotesOf } from '@features/map/utils/note'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { JourneyMapPresentation } from './JourneyMapPresentation'

const WIDTH = 774
const HEIGHT = 600

beforeEach(() => {
  // jsdom lays nothing out: give every element the scroller's size.
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(WIDTH)
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(HEIGHT)
  HTMLElement.prototype.scrollTo = vi.fn()
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    }
  )
  // Paint at once instead of on the next frame.
  vi.stubGlobal('requestAnimationFrame', (paint: FrameRequestCallback) => {
    paint(0)
    return 0
  })
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

interface Setup {
  source?: ReturnType<typeof journeyFixture>
  next?: { readonly id: string; readonly title: string } | null
}

interface HarnessProps {
  source: ReturnType<typeof journeyFixture>
  next: Setup['next']
  onPlay: (key: string) => void
  onShortcuts: () => void
}

const CHROME = {
  themeLabel: 'Night print',
  onToggleTheme: () => undefined,
  storageIssue: null,
  onExport: null,
  onTour: null,
}

/** The presentation with the selection and the view held as the container holds them. */
function Harness({ source, next, onPlay, onShortcuts }: HarnessProps) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [view, setView] = useState<MapView>('missions')
  const chapters = journeyChapters(source, next ?? null, JOURNEY_SKILLS)
  const shown = journeyChapters(source, next ?? null, JOURNEY_SKILLS, view)
  const stops = journeyMarks(chapters)
  const selected = stops.find((stop) => stop.key === selectedKey) ?? stops.find((stop) => stop.here) ?? stops[0]
  return (
    <JourneyMapPresentation
      chrome={CHROME}
      titleHref="#/"
      view={view}
      onView={setView}
      recommended={next ? { label: next.title, href: `#/mission/${next.id}` } : null}
      section={{
        chapters: shown,
        notes: mapNotesOf(shown),
        selectedKey: selected?.key ?? null,
        reducedMotion: true,
        onSelect: setSelectedKey,
        onPlay,
      }}
      detail={selected ? mapDetailOf(selected, chapters) : EMPTY_DETAIL}
      summary={journeySummary(chapters)}
      version="DICOMFall test"
      onShortcuts={onShortcuts}
    />
  )
}

function setup({ source = journeyFixture(), next = FIRST_MISSION }: Setup = {}) {
  const chapters = journeyChapters(source, next)
  const onPlay = vi.fn()
  const onShortcuts = vi.fn()
  const view = render(<Harness source={source} next={next} onPlay={onPlay} onShortcuts={onShortcuts} />)
  const stop = (name: RegExp) => screen.getByRole('button', { name })
  const detail = () => within(screen.getByRole('complementary'))
  /** The selected mission's status, as the panel's head prints it beside its mark. */
  const status = () => view.container.querySelector('.map-detail__state')?.textContent
  const note = () => view.container.querySelector('.map-note')?.textContent ?? ''
  return { view, chapters, onPlay, onShortcuts, stop, detail, status, note }
}

describe('JourneyMapPresentation', () => {
  it('names the screen in one h1 that can take the focus, with the way back to the title', () => {
    setup()
    const heading = screen.getByRole('heading', { level: 1, name: 'Archive Map' })
    expect(heading.getAttribute('tabindex')).toBe('-1')
    expect(screen.getByRole('link', { name: 'Title' }).getAttribute('href')).toBe('#/')
  })

  it('recommends the next mission and continues to it', () => {
    setup()
    const bar = within(screen.getByRole('navigation', { name: 'Archive Map' }))
    expect(bar.getByText('What the File Says')).toBeTruthy()
    expect(bar.getByRole('link', { name: 'Continue' }).getAttribute('href')).toBe('#/mission/what-the-file-says')
  })

  it('recommends nothing once every open mission is completed', () => {
    setup({ source: journeyFixture('completed'), next: null })
    expect(screen.queryByText(/Recommended next/)).toBeNull()
  })

  it('lists the six stages and the Bridge, in the drawing and on the gauge', () => {
    const { chapters } = setup()
    const drawing = within(screen.getByRole('group', { name: /^Archive Map, drawn as the journey/ }))
    for (const chapter of chapters) {
      expect(drawing.getByRole('group', { name: chapter.title })).toBeTruthy()
    }
    const gauge = within(screen.getByRole('navigation', { name: 'Stage gauge' }))
    expect(gauge.getAllByRole('listitem')).toHaveLength(7)
    expect(gauge.getByRole('button', { name: 'Stage 1, The First File, 0 of 1 passed' })).toBeTruthy()
    expect(gauge.getByRole('button', { name: 'Bridge, Planned: no missions yet' })).toBeTruthy()
  })

  it('says in words that a stage with no missions is planned', () => {
    setup()
    const stage = within(screen.getByRole('group', { name: 'Stage 4: The association' }))
    expect(stage.getByText('planned')).toBeTruthy()
    expect(stage.getByText('4 · planned')).toBeTruthy()
    expect(stage.getByText('Missions to come')).toBeTruthy()
    expect(stage.getAllByRole('button')).toHaveLength(1)
    expect(
      screen.getByRole('button', { name: 'Stage 4, The association, Planned: no missions yet' }).textContent
    ).toContain('planned')
  })

  it('shows a planned stage when its stop is selected: what it covers, its standard parts, and no Play', () => {
    const { stop, detail, status } = setup()
    fireEvent.click(stop(/^Missions to come, Stage 4, /))
    expect(detail().getByRole('heading', { level: 2, name: 'The association' })).toBeTruthy()
    expect(detail().getByText('Stage 4 of 6')).toBeTruthy()
    expect(status()).toBe('Not built yet')
    expect(detail().getByText('Covers')).toBeTruthy()
    expect(detail().getByText('PS3.8')).toBeTruthy()
    expect(detail().queryByRole('link')).toBeNull()
    expect(detail().queryByText('Attempts')).toBeNull()
    expect(detail().getByText(/still being built/)).toBeTruthy()
  })

  it('shows the Bridge by its label and where it stands, never a stage number', () => {
    const { stop, detail } = setup()
    fireEvent.click(stop(/^Missions to come, Bridge, /))
    expect(detail().getByRole('heading', { level: 2, name: 'Bridge' })).toBeTruthy()
    expect(detail().getByText('Between stages 3 and 4')).toBeTruthy()
  })

  it('shows the selected mission: its status in words, its objective, and a Play link to it', () => {
    const { detail, status } = setup()
    expect(detail().getByRole('heading', { level: 2, name: 'What the File Says' })).toBeTruthy()
    expect(status()).toBe('Available, you are here')
    expect(detail().getByText(FIRST_MISSION.objective)).toBeTruthy()
    expect(detail().getByText('Nothing: start here')).toBeTruthy()
    expect(detail().getByText('None yet')).toBeTruthy()
    expect(detail().getByText('PS3.10')).toBeTruthy()
    expect(detail().getByText('PS3.5')).toBeTruthy()
    expect(detail().getByRole('link', { name: 'Play' }).getAttribute('href')).toBe('#/mission/what-the-file-says')
  })

  it('gives a locked mission no link: plain words say what to complete first', () => {
    const { stop, detail, status } = setup({ source: longerJourneyFixture(false) })
    fireEvent.click(stop(/^1\.2 /))
    expect(detail().getByRole('heading', { level: 2, name: 'Under the Words' })).toBeTruthy()
    expect(status()).toBe('Locked')
    expect(detail().queryByRole('link')).toBeNull()
    expect(detail().getByText('Locked: complete What the File Says first.')).toBeTruthy()
    expect(detail().getByText('name-the-elements')).toBeTruthy()
    expect(detail().getByText('not yet')).toBeTruthy()
  })

  it("shows the mission's skills, how long it takes and its Codex cards, in Kernelfall's rows", () => {
    const { detail } = setup()
    const terms = detail()
      .getAllByRole('term')
      .map((term) => term.textContent)
    expect(terms).toEqual(['Objective', 'Skill', 'Needs', 'Time', 'Attempts', 'Hints used', 'Standard parts', 'Codex'])
    expect(detail().getByText('read-a-file')).toBeTruthy()
    expect(detail().getByText(/^Read what a DICOM file holds with go-dicom/)).toBeTruthy()
    expect(detail().getByText('About 15 min')).toBeTruthy()
    expect(detail().getByRole('link', { name: 'Data Set' }).getAttribute('href')).toBe('#/codex/data-set')
  })

  it("prints each region's heading in its stage", () => {
    setup()
    const stage = within(screen.getByRole('group', { name: 'Stage 1: The First File' }))
    expect(stage.getByText('Open the file')).toBeTruthy()
    expect(stage.getByText('in progress · 0 of 1')).toBeTruthy()
    expect(stage.getByText('cli/show.go, cli/info.go, PS3.10 §7')).toBeTruthy()
  })

  it('names the stops by their first skill in the Skills view, and keeps the panel on the mission', () => {
    const { stop, detail } = setup()
    const bar = within(screen.getByRole('navigation', { name: 'Archive Map' }))
    expect(bar.getByRole('button', { name: 'Missions' }).getAttribute('aria-pressed')).toBe('true')
    fireEvent.click(bar.getByRole('button', { name: 'Skills' }))
    expect(bar.getByRole('button', { name: 'Skills' }).getAttribute('aria-pressed')).toBe('true')
    expect(stop(/^1\.1 Read what a DICOM file holds with go-dicom, /)).toBeTruthy()
    expect(detail().getByRole('heading', { level: 2, name: 'What the File Says' })).toBeTruthy()
    fireEvent.click(bar.getByRole('button', { name: 'Missions' }))
    expect(stop(/^1\.1 What the File Says, /)).toBeTruthy()
  })

  it('offers Continue for a mission under way and Replay for a completed one', () => {
    const { stop, detail, status } = setup({ source: longerJourneyFixture(true), next: SECOND_MISSION })
    expect(detail().getByRole('link', { name: 'Play' })).toBeTruthy()
    fireEvent.click(stop(/^1\.1 /))
    expect(status()).toBe('Done with help')
    expect(detail().getByRole('link', { name: 'Replay' })).toBeTruthy()
    expect(detail().getByText('3 judged attempts')).toBeTruthy()
    expect(detail().getByText('2 hints')).toBeTruthy()
  })

  it('walks the road with the arrow keys, Home and End, and plays with Enter', () => {
    const { stop, detail, onPlay } = setup({ source: longerJourneyFixture(false) })
    const first = stop(/^1\.1 /)
    const second = stop(/^1\.2 /)
    expect(first.getAttribute('tabindex')).toBe('0')
    expect(second.getAttribute('tabindex')).toBe('-1')

    first.focus()
    fireEvent.keyDown(first, { key: 'ArrowRight' })
    expect(document.activeElement).toBe(second)
    expect(second.getAttribute('aria-pressed')).toBe('true')
    expect(detail().getByRole('heading', { level: 2, name: 'Under the Words' })).toBeTruthy()

    // The road goes on into the next stage, through its planned stop.
    const next = stop(/^Missions to come, Stage 2, /)
    fireEvent.keyDown(second, { key: 'ArrowDown' })
    expect(document.activeElement).toBe(next)
    expect(detail().getByRole('heading', { level: 2, name: 'The elements' })).toBeTruthy()
    fireEvent.keyDown(next, { key: 'Enter' })
    expect(onPlay).toHaveBeenLastCalledWith('planned:the-elements')

    fireEvent.keyDown(next, { key: 'Home' })
    expect(document.activeElement).toBe(first)
    fireEvent.keyDown(first, { key: 'End' })
    expect(document.activeElement).toBe(stop(/^Missions to come, Stage 6, /))
    fireEvent.keyDown(stop(/^Missions to come, Stage 6, /), { key: 'ArrowDown' })
    expect(document.activeElement).toBe(stop(/^Missions to come, Stage 6, /))

    fireEvent.keyDown(second, { key: 'ArrowUp' })
    expect(document.activeElement).toBe(first)
    // Page Down and Page Up change stage: the first stop of the next one, of the one before.
    fireEvent.keyDown(first, { key: 'PageDown' })
    expect(document.activeElement).toBe(next)
    fireEvent.keyDown(next, { key: 'PageUp' })
    expect(document.activeElement).toBe(first)
    fireEvent.keyDown(first, { key: 'PageUp' })
    expect(document.activeElement).toBe(first)

    fireEvent.keyDown(first, { key: 'Enter' })
    expect(onPlay).toHaveBeenLastCalledWith(FIRST_MISSION.id)
  })

  it('explains the focused mission under the drawing, else the stage in view', () => {
    const { stop, note } = setup()
    expect(note()).toContain('What this stage covers · ')
    const mission = stop(/^1\.1 /)
    fireEvent.focus(mission)
    expect(note()).toContain('1.1 · What the File Says')
    expect(note()).toContain('Next up')
    fireEvent.blur(mission)
    fireEvent.mouseEnter(screen.getByRole('button', { name: /^Stage 5, / }))
    expect(note()).toContain('What this stage covers · Query and retrieve')
  })

  it('scrolls to a stage from the gauge and back to "you" with Find me', () => {
    setup()
    const scrollTo = vi.mocked(HTMLElement.prototype.scrollTo)
    scrollTo.mockClear()
    fireEvent.click(screen.getByRole('button', { name: /^Stage 6, / }))
    expect(scrollTo).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('button', { name: 'Find me' }))
    expect(scrollTo).toHaveBeenCalledTimes(2)
  })

  it('has nowhere to find when the player stands nowhere', () => {
    setup({ source: journeyFixture('completed'), next: null })
    expect(screen.getByRole('button', { name: 'Find me' }).hasAttribute('disabled')).toBe(true)
  })

  it('explains every shape in the legend, in words', () => {
    setup()
    const legend = within(screen.getByRole('region', { name: 'Legend' }))
    expect(legend.getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      'Not built yet',
      'Locked',
      'Available',
      'In progress',
      'Done',
      'Done, first try',
      'Done with help',
    ])
  })

  it('keeps the status foot: where the player is, the version, and the shortcuts', () => {
    const { onShortcuts } = setup()
    expect(screen.getByText('Stage 1, The First File: 0 of 1 mission passed · 6 stages planned')).toBeTruthy()
    expect(screen.getByText('DICOMFall test')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /^Shortcuts/ }))
    expect(onShortcuts).toHaveBeenCalledOnce()
  })

  it('stays a whole screen before the content is loaded', () => {
    setup({ source: [], next: null })
    expect(screen.getByRole('heading', { level: 1, name: 'Archive Map' })).toBeTruthy()
    expect(screen.getByRole('heading', { level: 2, name: EMPTY_DETAIL.title })).toBeTruthy()
    expect(screen.getByRole('region', { name: 'Legend' })).toBeTruthy()
  })

  it('never calls the Machine anything but real', () => {
    const { view } = setup()
    expect(view.container.textContent?.toLowerCase()).not.toMatch(/simulat|emulat/)
  })
})
