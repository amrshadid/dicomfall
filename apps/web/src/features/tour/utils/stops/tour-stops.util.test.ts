import type { TourStop } from '@features/tour/types'
import { describe, expect, it } from 'vitest'
import { MAX_STOP_TEXT_LENGTH, TOUR_STOPS } from './tour-stops.constants'
import { stopsToShow } from './tour-stops.util'

const stop = (id: string, selector: string): TourStop => ({ id, selector, title: id, text: id })

const STOPS = [
  stop('mission:guide', '#mission-guide'),
  stop('mission:console', '#mission-console'),
  stop('mission:inspector', '#mission-inspector'),
  stop('mission:lightbox', '#mission-lightbox'),
]

const onScreen =
  (...selectors: string[]) =>
  (selector: string) =>
    selectors.includes(selector)

describe('stopsToShow', () => {
  it("never shows a panel that isn't on screen yet", () => {
    const shown = stopsToShow(STOPS, {
      mode: 'auto',
      seen: [],
      isPresent: onScreen('#mission-guide', '#mission-inspector'),
    })
    expect(shown.map((s) => s.id)).toEqual(['mission:guide', 'mission:inspector'])
  })

  it('starts on its own only for stops not seen yet, such as a panel that just appeared', () => {
    const shown = stopsToShow(STOPS, {
      mode: 'auto',
      seen: ['mission:guide', 'mission:inspector'],
      isPresent: onScreen('#mission-guide', '#mission-inspector', '#mission-lightbox'),
    })
    expect(shown.map((s) => s.id)).toEqual(['mission:lightbox'])
  })

  it('has nothing to start once every stop on screen was seen', () => {
    const shown = stopsToShow(STOPS, {
      mode: 'auto',
      seen: ['mission:guide'],
      isPresent: onScreen('#mission-guide'),
    })
    expect(shown).toEqual([])
  })

  it('replays every stop on screen, seen or not', () => {
    const shown = stopsToShow(STOPS, {
      mode: 'replay',
      seen: STOPS.map((s) => s.id),
      isPresent: onScreen('#mission-guide', '#mission-console'),
    })
    expect(shown.map((s) => s.id)).toEqual(['mission:guide', 'mission:console'])
  })
})

describe('TOUR_STOPS', () => {
  it('uses unique ids prefixed with their screen', () => {
    for (const [screen, stops] of Object.entries(TOUR_STOPS)) {
      const ids = stops.map((s) => s.id)
      expect(new Set(ids).size).toBe(ids.length)
      expect(ids.every((id) => id.startsWith(`${screen}:`))).toBe(true)
    }
  })

  it('keeps each stop to one short sentence or two', () => {
    for (const stops of Object.values(TOUR_STOPS)) {
      for (const s of stops) {
        expect(s.text.length).toBeLessThanOrEqual(MAX_STOP_TEXT_LENGTH)
      }
    }
  })
})
