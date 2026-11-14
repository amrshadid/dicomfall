// @vitest-environment jsdom
import { parseMarkdown } from '@features/guide/utils/markdown'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { MarkdownText } from './MarkdownText'

afterEach(cleanup)

const SOURCE = [
  '## What noticed',
  '',
  'The file opens with a **preamble** of 128 bytes. See `go-dicom show /lab/ct.dcm`.',
  '',
  '- one end',
  '- the other end',
  '',
  '1. first',
  '',
  '```',
  'cd /lab',
  ' ls',
  '```',
].join('\n')

describe('MarkdownText', () => {
  it('prints headings at the level the page gives them', () => {
    render(<MarkdownText blocks={parseMarkdown(SOURCE)} topLevel={2} />)
    expect(screen.getByRole('heading', { level: 3, name: 'What noticed' })).toBeTruthy()
  })

  it('sets bold and real terms inside a paragraph', () => {
    render(<MarkdownText blocks={parseMarkdown(SOURCE)} />)
    expect(screen.getByText('preamble').tagName).toBe('B')
    expect(screen.getByText('go-dicom show /lab/ct.dcm').tagName).toBe('CODE')
  })

  it('keeps a bulleted and a numbered list apart', () => {
    const { container } = render(<MarkdownText blocks={parseMarkdown(SOURCE)} />)
    expect([...container.querySelectorAll('ul li')].map((item) => item.textContent)).toEqual([
      'one end',
      'the other end',
    ])
    expect(container.querySelector('ol li')?.textContent).toBe('first')
  })

  it('prints a code block as written, in a region keys can scroll', () => {
    const { container } = render(<MarkdownText blocks={parseMarkdown(SOURCE)} />)
    const block = container.querySelector('pre')
    expect(block?.textContent).toBe('cd /lab\n ls')
    expect(block?.getAttribute('tabindex')).toBe('0')
  })
})
