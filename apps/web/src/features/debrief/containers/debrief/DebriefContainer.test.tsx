// @vitest-environment jsdom
import { codexView } from '@dicomfall/game/utils'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEBRIEF_CONTENT, DEBRIEF_MISSION, debriefProgressOf } from '@/test/fixtures/debrief.fixture'
import { DebriefContainer } from './DebriefContainer'

const mocks = vi.hoisted(() => ({
  mission: null as unknown,
  codex: null as unknown,
  playAgain: vi.fn(),
  leaveDebrief: vi.fn(() => Promise.resolve()),
}))

vi.mock('@dicomfall/game/hooks', () => ({
  useActiveMission: () => ({ mission: mocks.mission, isCompleted: true }),
  useCodex: () => mocks.codex,
  useMissionActions: () => ({ leaveDebrief: mocks.leaveDebrief }),
}))

// The content on disk changes as missions are written: the screen is tested on a fixed one.
vi.mock('@features/content/hooks/content', async () => {
  const { DEBRIEF_CONTENT } = await import('@/test/fixtures/debrief.fixture')
  const debrief = [{ kind: 'line', speaker: 'The Preamble', text: 'A file is four regions. You found each one.' }]
  return {
    useContent: () => ({
      game: DEBRIEF_CONTENT,
      storyOf: () => ({ title: 'The Four Regions', question: null, sections: new Map([['debrief', debrief]]) }),
      folderOf: () => undefined,
    }),
  }
})

beforeEach(() => {
  mocks.mission = DEBRIEF_MISSION
  mocks.codex = codexView(debriefProgressOf(true), DEBRIEF_CONTENT)
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('DebriefContainer', () => {
  it("opens with the debrief's first sentence and the result", () => {
    render(<DebriefContainer onPlayAgain={mocks.playAgain} />)
    expect(screen.getByRole('heading', { level: 2, name: 'A file is four regions.' })).toBeTruthy()
    expect(screen.getByText('Mission complete · 2 of 2 objectives met')).toBeTruthy()
  })

  it('names the terms it taught and prints the cards it filed in the Codex', () => {
    render(<DebriefContainer onPlayAgain={mocks.playAgain} />)
    expect(screen.getAllByText('the preamble').length).toBeGreaterThan(0)
    const card = screen.getByRole('article', { name: 'the preamble' })
    expect(card.querySelector('.df-man-page__stamp')?.textContent).toBe('FiledCodex · The Four Regions')
  })

  it('plays the mission again from the start on Replay mission, and leads back to the Archive Map', () => {
    render(<DebriefContainer onPlayAgain={mocks.playAgain} />)
    fireEvent.click(screen.getByRole('button', { name: 'Replay mission' }))
    expect(mocks.playAgain).toHaveBeenCalledTimes(1)
    const map = screen.getByRole('link', { name: 'Back to the map' })
    expect(map.getAttribute('href')).toBe('#/map')
    expect(mocks.leaveDebrief).not.toHaveBeenCalled()
    fireEvent.click(map)
    // Leaving through the debrief closes it, so the mission no longer reopens at it.
    expect(mocks.leaveDebrief).toHaveBeenCalledTimes(1)
  })

  it('draws nothing when no mission is being played', () => {
    mocks.mission = null
    const { container } = render(<DebriefContainer onPlayAgain={mocks.playAgain} />)
    expect(container.innerHTML).toBe('')
  })
})
