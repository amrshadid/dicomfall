import { hrefOf } from '@shared/navigation'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { MapPlaceholderContainer } from './MapPlaceholderContainer'

describe('MapPlaceholderContainer', () => {
  it('names the Archive Map and links back to the title', () => {
    const html = renderToStaticMarkup(<MapPlaceholderContainer />)
    expect(html).toContain('Archive Map')
    expect(html).toContain(`href="${hrefOf({ name: 'title' })}"`)
  })
})
