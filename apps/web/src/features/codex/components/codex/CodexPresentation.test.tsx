// @vitest-environment jsdom
import type { CodexPresentationProps } from '@features/codex/components/codex'
import { codexIndexOf, codexPageOf, fieldGuideRowsOf, glossaryRowsOf } from '@features/codex/utils/book'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CODEX, FIELD_GUIDE, FINISHED_CODEX, missionLabel } from '@/test/fixtures/codex.fixture'
import { CodexPresentation } from './CodexPresentation'

afterEach(cleanup)

const CHROME = { themeLabel: 'Night print', onToggleTheme: () => {}, storageIssue: null, onExport: null, onTour: null }

function codex(
  selection: { cardId: string | null; chapterId: string | null },
  overrides: Partial<CodexPresentationProps> = {}
) {
  const props: CodexPresentationProps = {
    chrome: CHROME,
    backHref: '#/',
    filed: CODEX.filed,
    total: CODEX.total,
    chapters: codexIndexOf(CODEX, selection),
    page: codexPageOf(CODEX, selection, missionLabel),
    fieldGuide: fieldGuideRowsOf(FIELD_GUIDE, missionLabel),
    glossary: glossaryRowsOf(CODEX.glossary),
    tab: 'cards',
    onTab: vi.fn(),
    ...overrides,
  }
  render(<CodexPresentation {...props} />)
  return props
}

describe('CodexPresentation', () => {
  it('counts the cards filed in the whole book, and in each chapter', () => {
    codex({ cardId: null, chapterId: 'the-first-file' })
    expect(screen.getByText('2 of 4 cards filed')).toBeTruthy()
    const chapter = screen.getByRole('region', { name: 'Stage 1 · The First File' })
    expect(within(chapter).getByText('2 / 3 filed')).toBeTruthy()
  })

  it('heads a labelled chapter with its label, never a stage number', () => {
    codex({ cardId: null, chapterId: 'the-bridge' })
    expect(screen.getByRole('region', { name: 'Bridge · On disk and on the wire' })).toBeTruthy()
    expect(within(screen.getByRole('article', { name: 'On disk and on the wire' })).getByText('Bridge')).toBeTruthy()
  })

  it('shows a card not found yet as a blank outline with its mission number, in words too', () => {
    codex({ cardId: null, chapterId: 'the-first-file' })
    const chapter = screen.getByRole('region', { name: 'Stage 1 · The First File' })
    expect(within(chapter).getAllByRole('link')).toHaveLength(3)
    expect(within(chapter).getByText('1.3 · not found yet')).toBeTruthy()
  })

  it("opens a chapter's title page: its story, guide, the part of DICOM and its cards", () => {
    codex({ cardId: null, chapterId: 'the-first-file' })
    const page = screen.getByRole('article', { name: 'The First File' })
    expect(within(page).getByText(/One CT file waits on the disk/)).toBeTruthy()
    expect(within(page).getByText(/The Preamble/)).toBeTruthy()
    expect(within(page).getByText('Part 10, the file format')).toBeTruthy()
    expect(within(page).queryByText('You can now…')).toBeNull()
  })

  it('ends a finished chapter with "You can now…"', () => {
    const selection = { cardId: null, chapterId: 'the-first-file' }
    codex(selection, { page: codexPageOf(FINISHED_CODEX, selection, missionLabel) })
    const now = screen.getByRole('region', { name: 'You can now…' })
    expect(within(now).getAllByRole('listitem')).toHaveLength(2)
  })

  it('prints a card as a man page, with its go-dicom source linked and its deepened chain', () => {
    codex({ cardId: 'preamble', chapterId: null })
    const card = screen.getByRole('article', { name: 'the preamble' })
    expect(within(card).getByRole('link', { name: 'filereader/filereader.go' }).getAttribute('href')).toBe(
      'https://github.com/amrshadid/go-dicom/blob/v1.9.0/filereader/filereader.go'
    )
    expect(within(card).getByText('a card not found yet, 1.3')).toBeTruthy()
    expect(within(card).getByText('1.1 Open the File')).toBeTruthy()
  })

  it('says a seen card is filed once its mission is finished', () => {
    codex({ cardId: 'command-set', chapterId: null })
    expect(screen.getByText(/You've met this one in B.1 On Disk and on the Wire/)).toBeTruthy()
  })

  it('turns to the Field Guide and the glossary', () => {
    const props = codex({ cardId: null, chapterId: null })
    fireEvent.click(screen.getByRole('tab', { name: 'Field Guide' }))
    expect(props.onTab).toHaveBeenCalledWith('field-guide')
    cleanup()
    codex({ cardId: null, chapterId: null }, { tab: 'field-guide' })
    const table = screen.getByRole('table', { name: 'Field Guide' })
    expect(within(table).getByText('go-dicom show')).toBeTruthy()
    expect(within(table).getByText('Linux shell')).toBeTruthy()
    cleanup()
    codex({ cardId: null, chapterId: null }, { tab: 'glossary' })
    expect(screen.getByRole('link', { name: 'the DICM prefix' }).getAttribute('href')).toBe('#/codex/dicm-prefix')
  })

  it('keeps the Field Guide tab back until it opens', () => {
    codex({ cardId: null, chapterId: null }, { fieldGuide: null })
    expect(screen.queryByRole('tab', { name: 'Field Guide' })).toBeNull()
    expect(screen.getByRole('tab', { name: 'Glossary' })).toBeTruthy()
  })
})
