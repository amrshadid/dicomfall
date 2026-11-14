// @vitest-environment jsdom
import { useAppStore } from '@app/store'
import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useTour } from './useTour.hook'

// driver.js needs a real layout; the hook's job is choosing the stops, so the driver is faked.
const driver = vi.hoisted(() => ({
  active: false,
  onScreen: new Set<string>(),
  played: [] as { ids: readonly string[]; animate: boolean }[],
}))

vi.mock('@features/tour/utils/driver', () => ({
  isTourActive: () => driver.active,
  isOnScreen: (selector: string) => driver.onScreen.has(selector),
  playTour: (stops: readonly { id: string }[], animate: boolean) => {
    driver.played.push({ ids: stops.map((stop) => stop.id), animate })
  },
  stopTour: () => {},
}))

beforeEach(() => {
  vi.stubGlobal('matchMedia', () => ({ matches: false }))
  driver.active = false
  // Only the start button is on screen: the contents have not rendered yet.
  driver.onScreen = new Set(['.title__continue [data-primary]'])
  driver.played = []
  useAppStore.getState().setTourScreen('title')
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  useAppStore.getState().setTourScreen(null)
  useAppStore.getState().resetSettings()
  document.body.innerHTML = ''
})

describe('useTour', () => {
  it('plays the stops on screen once on its own, and every one on a replay', () => {
    const { result } = renderHook(() => useTour())
    expect(result.current.screen).toBe('title')

    act(() => result.current.start('auto'))
    expect(driver.played).toEqual([{ ids: ['title:start'], animate: true }])
    expect(useAppStore.getState().toursSeen).toEqual(['title:start'])

    act(() => result.current.start('auto'))
    expect(driver.played).toHaveLength(1)

    act(() => result.current.start('replay'))
    expect(driver.played).toHaveLength(2)
  })

  it('points at a panel the first time it appears, and never at one not on screen', () => {
    const { result } = renderHook(() => useTour())
    act(() => result.current.start('auto'))
    expect(driver.played.flatMap((tour) => tour.ids)).not.toContain('title:contents')
    driver.onScreen.add('.title__menu')
    act(() => result.current.start('auto'))
    expect(driver.played[1]?.ids).toEqual(['title:contents'])
  })

  it('never starts over an open dialog or another tour', () => {
    const { result } = renderHook(() => useTour())
    const dialog = document.body.appendChild(document.createElement('dialog'))
    dialog.setAttribute('open', '')
    act(() => result.current.start('replay'))
    dialog.remove()
    driver.active = true
    act(() => result.current.start('replay'))
    expect(driver.played).toEqual([])
  })

  it('draws without motion when the player turned it off', () => {
    useAppStore.getState().setMotion('reduce')
    const { result } = renderHook(() => useTour())
    act(() => result.current.start('replay'))
    expect(driver.played[0]?.animate).toBe(false)
  })

  it('forgets the stops seen, so every screen tours again', () => {
    useAppStore.getState().markToursSeen(['title:start'])
    const { result } = renderHook(() => useTour())
    act(() => result.current.resetSeen())
    expect(useAppStore.getState().toursSeen).toEqual([])
  })
})
