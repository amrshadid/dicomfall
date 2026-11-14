import { describe, expect, it } from 'vitest'

interface NodeFs {
  readFileSync(path: URL, encoding: 'utf8'): string
}

// Read from disk: Vitest replaces every CSS import with an empty string, and jsdom lays nothing
// out. The app's tsconfig has no Node types, so `node:fs` is imported by name and typed here.
const NODE_FS = 'node:fs'
const { readFileSync }: NodeFs = await import(/* @vite-ignore */ NODE_FS)
const layout = readFileSync(new URL('./MissionLayout.css', import.meta.url), 'utf8')
const inspector = readFileSync(
  new URL('../../../inspector/components/inspector/Inspector.css', import.meta.url),
  'utf8'
)

/** The declarations of the first rule whose selector is exactly `selector`. */
function ruleOf(css: string, selector: string): Record<string, string> {
  const open = css.indexOf(`\n${selector} {`)
  if (open === -1) {
    throw new Error(`no rule for ${selector}`)
  }
  const body = css.slice(css.indexOf('{', open) + 1, css.indexOf('}', open)).replace(/\/\*[\s\S]*?\*\//g, '')
  return Object.fromEntries(
    body
      .split(';')
      .map((declaration) => declaration.split(':').map((part) => part.trim()))
      .filter((parts): parts is [string, string] => parts.length === 2 && parts[0] !== '')
  )
}

// The sister game's play-testers saw both panels of this column cut off on the left: a tab bar
// wider than the column, brought into view by focus, scrolled the whole column sideways.
describe('the Bench column', () => {
  it('can never be scrolled sideways, by the player or by focus', () => {
    expect(ruleOf(layout, '.mission-bench').overflow).toBe('clip')
    expect(ruleOf(layout, '.mission-bench__inspector').overflow).toBe('clip')
    expect(ruleOf(layout, '.mission-console').overflow).toBe('clip')
  })

  it('keeps the Inspector and its tab bar inside the column', () => {
    const cell = ruleOf(layout, '.mission-bench__inspector')
    expect(cell['min-width']).toBe('0')
    expect(cell['grid-template-columns']).toBe('minmax(0, 1fr)')
    expect(ruleOf(inspector, '.inspector__bar .df-tabs')['min-width']).toBe('0')
  })

  it('scrolls a console wider than its box inside the box, sideways only', () => {
    expect(ruleOf(layout, '.mission-console__slot').overflow).toBe('auto hidden')
  })
})
