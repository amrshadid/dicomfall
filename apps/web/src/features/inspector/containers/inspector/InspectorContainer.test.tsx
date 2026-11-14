// @vitest-environment jsdom

import { NO_PLAYER_ACTIONS } from '@dicomfall/game/types'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CT_EXPLICIT_READING, ctExplicitBytes } from '@/test/fixtures/show-reading.fixture'
import { InspectorContainer } from './InspectorContainer'

afterEach(cleanup)

describe('InspectorContainer', () => {
  it('opens on the File tab and says, in words, what it will show and why it waits', () => {
    render(<InspectorContainer />)
    expect(screen.getByRole('tab', { name: 'File' }).getAttribute('aria-selected')).toBe('true')
    expect(screen.getByRole('status').textContent).toContain('The File inspector opens when the Machine is ready')
    expect(screen.getByRole('tabpanel', { name: 'File' })).toBeTruthy()
  })

  it('moves to the Wire tab, from the mouse or the arrow keys', () => {
    render(<InspectorContainer />)
    fireEvent.click(screen.getByRole('tab', { name: 'Wire' }))
    expect(screen.getByRole('status').textContent).toContain('The Wire inspector opens when the Machine is ready')
    fireEvent.keyDown(screen.getByRole('tablist'), { key: 'ArrowRight' })
    expect(screen.getByRole('tab', { name: 'File' }).getAttribute('aria-selected')).toBe('true')
  })

  it("draws the play-through's file once go-dicom has read it, and hands each mark to the play-through", () => {
    const mark = vi.fn()
    render(
      <InspectorContainer
        play={{
          files: ['/lab/ct-explicit-le.dcm'],
          file: '/lab/ct-explicit-le.dcm',
          selectFile: vi.fn(),
          reading: {
            phase: 'ready',
            reading: CT_EXPLICIT_READING,
            bytes: ctExplicitBytes(),
            errors: [],
            reload: vi.fn(),
          },
          actions: { ...NO_PLAYER_ACTIONS, selection: { file: '/lab/ct-explicit-le.dcm', from: 0, to: 128 } },
          mark,
        }}
      />
    )
    expect(screen.queryByRole('status')).toBeNull()
    expect(screen.getByText(/bytes 0 to 127 \(128 bytes\)/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /^0008,0060 Modality/ }))
    expect(mark).toHaveBeenCalledWith({ from: 628, to: 638 })
  })

  it('keeps its words while the lab is not built yet', () => {
    render(
      <InspectorContainer
        play={{
          files: ['/lab/ct-explicit-le.dcm'],
          file: '/lab/ct-explicit-le.dcm',
          selectFile: vi.fn(),
          reading: { phase: 'idle', reading: null, bytes: null, errors: [], reload: vi.fn() },
          actions: NO_PLAYER_ACTIONS,
          mark: vi.fn(),
        }}
      />
    )
    expect(screen.getByRole('status').textContent).toContain('The File inspector opens when the Machine is ready')
  })

  it('draws nothing in place of the bytes it does not have', () => {
    render(<InspectorContainer />)
    const panel = screen.getByRole('tabpanel')
    expect(panel.children).toHaveLength(1)
    expect(panel.querySelector('table, svg, pre')).toBeNull()
  })
})
