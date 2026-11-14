// @vitest-environment jsdom
import type { DebriefPresentationProps } from '@features/debrief/types'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DEBRIEF_CARDS, DEBRIEF_LEARNED } from '@/test/fixtures/debrief.fixture'
import { DebriefPresentation } from './DebriefPresentation'

afterEach(cleanup)

function debrief(overrides: Partial<DebriefPresentationProps> = {}) {
  const props: DebriefPresentationProps = {
    headline: 'A Part 10 file is four regions, in one order.',
    result: 'Mission complete · 2 of 2 objectives met',
    learned: DEBRIEF_LEARNED,
    cards: DEBRIEF_CARDS,
    seenIn: '1.1 The Four Regions',
    stage: null,
    next: null,
    onReplay: vi.fn(),
    mapHref: '#/map',
    onMap: vi.fn(),
    ...overrides,
  }
  render(<DebriefPresentation {...props} />)
  return props
}

describe('DebriefPresentation', () => {
  it("opens as Kernelfall's card: the debrief's headline, then the result in words", () => {
    debrief()
    const region = screen.getByRole('region', { name: /^A Part 10 file is four regions/ })
    expect(within(region).getByRole('heading', { level: 2 }).textContent).toBe(
      'A Part 10 file is four regions, in one order.'
    )
    expect(within(region).getByText('Mission complete · 2 of 2 objectives met')).toBeTruthy()
  })

  it('prints every card the mission filed, stamped Filed with where it was filed', () => {
    debrief()
    const cards = screen.getAllByRole('article')
    expect(cards).toHaveLength(DEBRIEF_CARDS.length)
    for (const card of cards) {
      expect(card.querySelector('.df-man-page__stamp')?.textContent).toBe('FiledCodex · 1.1 The Four Regions')
    }
    expect(cards.map((card) => card.getAttribute('aria-labelledby'))).toEqual(
      DEBRIEF_CARDS.map((card) => `codex-${card.id}`)
    )
  })

  it("offers Kernelfall's three ways on: the next mission first, Replay, and back to the map", () => {
    const onSelect = vi.fn()
    const { onReplay } = debrief({ next: { label: 'Next mission: The Transfer Syntax', onSelect } })
    const actions = [...document.querySelectorAll('.debrief__actions > *')].map((action) => action.textContent)
    expect(actions).toEqual(['Next mission: The Transfer Syntax', 'Replay mission', 'Back to the map'])
    fireEvent.click(screen.getByRole('button', { name: 'Next mission: The Transfer Syntax' }))
    expect(onSelect).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('button', { name: 'Replay mission' }))
    expect(onReplay).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('link', { name: 'Back to the map' }).getAttribute('href')).toBe('#/map')
  })

  it('makes the map the primary way on when there is no next mission, and says when it is followed', () => {
    const { onMap } = debrief()
    const link = screen.getByRole('link', { name: 'Back to the map' })
    expect(link.className).toContain('primary')
    fireEvent.click(link)
    expect(onMap).toHaveBeenCalledTimes(1)
  })

  it('shows what the player can now do once the mission finishes its stage', () => {
    debrief({
      stage: { name: 'Stage 1 · The First File', outcomes: ['Find the four regions of a Part 10 file.'] },
    })
    const stage = screen.getByRole('region', { name: 'Stage 1 · The First File, done' })
    expect(within(stage).getByText('You can now…')).toBeTruthy()
    expect(within(stage).getByRole('listitem').textContent).toBe('Find the four regions of a Part 10 file.')
  })

  it('leaves out the parts it has nothing for', () => {
    debrief({ learned: [], cards: [] })
    expect(screen.getAllByRole('region')).toHaveLength(1)
    expect(screen.queryByText('New in this mission')).toBeNull()
    expect(screen.queryByRole('article')).toBeNull()
  })
})
