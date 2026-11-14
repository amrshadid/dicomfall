import { describe, expect, it } from 'vitest'
import { buttonClass } from './button.util'

describe('buttonClass', () => {
  it('combines the variant, the size and any extra class', () => {
    expect(buttonClass('primary', 'lg', 'x')).toBe('df-btn df-btn--primary df-btn--lg x')
  })

  it('leaves out a missing extra class', () => {
    expect(buttonClass('quiet', 'md', undefined)).toBe('df-btn df-btn--quiet df-btn--md')
  })
})
