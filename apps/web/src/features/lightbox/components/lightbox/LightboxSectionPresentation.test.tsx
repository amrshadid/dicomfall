// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { LightboxSectionPresentation } from './LightboxSectionPresentation'

afterEach(cleanup)

describe('LightboxSectionPresentation', () => {
  it.each([
    ['preview', 'Image', 'The image preview opens when the Machine is ready'],
    ['uids', 'UID trail', 'The UID trail opens when the Machine is ready'],
    ['timeline', 'Timeline', 'The timeline opens when the Machine is ready'],
  ] as const)('names the %s section and says in words what it will show', (section, title, waiting) => {
    render(<LightboxSectionPresentation section={section} />)
    const region = screen.getByRole('region', { name: new RegExp(`^${title}`) })
    expect(region.textContent).toContain(waiting)
    expect(region.querySelector('img, svg, canvas, table')).toBeNull()
  })
})
