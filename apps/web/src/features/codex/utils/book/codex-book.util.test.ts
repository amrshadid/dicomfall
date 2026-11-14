import { describe, expect, it } from 'vitest'
import { CODEX, FIELD_GUIDE, FINISHED_CODEX, missionLabel } from '@/test/fixtures/codex.fixture'
import { codexIndexOf, codexPageOf, fieldGuideRowsOf, glossaryRowsOf, goDicomSourceUrl } from './codex-book.util'

const AT_START = { cardId: null, chapterId: null }
const GO_DICOM = 'https://github.com/amrshadid/go-dicom/blob/v1.9.0/'

describe('codexIndexOf', () => {
  it('lists every chapter in play order, with its progress, a labelled one by its label', () => {
    const index = codexIndexOf(CODEX, AT_START)
    expect(index.map((chapter) => [chapter.heading, chapter.count])).toEqual([
      ['Stage 1 · The First File', '2 / 3 filed'],
      ['Bridge · On disk and on the wire', '0 / 1 filed'],
    ])
  })

  it('keeps a card not found yet as a blank outline with its mission number, never its term', () => {
    const [first] = codexIndexOf(CODEX, AT_START)
    const blank = first?.entries[2]
    expect(blank).toMatchObject({ state: 'blank', term: null, href: null, missionNumber: '1.3' })
    expect(JSON.stringify(first)).not.toContain('Transfer Syntax')
  })

  it('links found cards in teaching order and marks the one on the page', () => {
    const [first, second] = codexIndexOf(CODEX, { cardId: 'dicm-prefix', chapterId: null })
    expect(first?.entries.map((entry) => entry.term)).toEqual(['the preamble', 'the DICM prefix', null])
    expect(first?.entries[1]).toMatchObject({ current: true, href: '#/codex/dicm-prefix', state: 'filed' })
    expect(second?.entries[0]).toMatchObject({ state: 'seen', term: 'the Command Set', missionNumber: 'B.1' })
  })
})

describe('codexPageOf', () => {
  it("opens a chapter's title page: its story, its guide and the part of DICOM it stands for", () => {
    const page = codexPageOf(CODEX, { cardId: null, chapterId: 'the-first-file' }, missionLabel)
    expect(page.kind).toBe('chapter')
    if (page.kind !== 'chapter') return
    expect(page.chapter).toMatchObject({
      kicker: 'Stage 1',
      title: 'The First File',
      guide: { name: 'The Preamble' },
      standsFor: 'Part 10, the file format',
      count: '2 / 3 filed',
      youCanNow: [],
    })
  })

  it("opens on the latest chapter with a card found, and heads the Bridge's page with its label", () => {
    expect(codexPageOf(CODEX, AT_START, missionLabel)).toMatchObject({
      chapter: { id: 'the-bridge', kicker: 'Bridge' },
    })
  })

  it('ends a finished chapter with what the player can now do', () => {
    const page = codexPageOf(FINISHED_CODEX, { cardId: null, chapterId: 'the-first-file' }, missionLabel)
    expect(page.kind === 'chapter' && page.chapter.youCanNow).toEqual([
      'Find the four regions of a Part 10 file.',
      'Read the Transfer Syntax UID and say what it tells the reader.',
    ])
  })

  it("prints a card with its sources linked to go-dicom's pinned release and the mission that files it", () => {
    const page = codexPageOf(CODEX, { cardId: 'preamble', chapterId: null }, missionLabel)
    expect(page).toMatchObject({
      kind: 'card',
      filed: true,
      card: {
        term: 'the preamble',
        sources: [{ path: 'filereader/filereader.go', href: `${GO_DICOM}filereader/filereader.go` }],
        filedIn: '1.1 Open the File',
      },
    })
  })

  it('links deepens both ways, hiding the term of a card not found yet', () => {
    const before = codexPageOf(CODEX, { cardId: 'preamble', chapterId: null }, missionLabel)
    expect(before.kind === 'card' && before.card.deepenedBy).toEqual([{ term: null, href: null, missionNumber: '1.3' }])
    const after = codexPageOf(FINISHED_CODEX, { cardId: 'transfer-syntax', chapterId: null }, missionLabel)
    expect(after.kind === 'card' && after.card.deepens).toEqual({
      term: 'the preamble',
      href: '#/codex/preamble',
      missionNumber: '1.1',
    })
    const back = codexPageOf(FINISHED_CODEX, { cardId: 'preamble', chapterId: null }, missionLabel)
    expect(back.kind === 'card' && back.card.deepenedBy[0]?.href).toBe('#/codex/transfer-syntax')
  })

  it('never opens a hidden card, even from its address', () => {
    expect(codexPageOf(CODEX, { cardId: 'transfer-syntax', chapterId: null }, missionLabel).kind).toBe('chapter')
  })

  it('has nothing to show before there is a chapter', () => {
    expect(codexPageOf({ chapters: [], glossary: [], filed: 0, total: 0 }, AT_START, missionLabel)).toEqual({
      kind: 'empty',
    })
  })
})

describe('the Field Guide and the glossary', () => {
  it('says what kind each command is and where it was met', () => {
    expect(fieldGuideRowsOf(FIELD_GUIDE, missionLabel)).toEqual([
      {
        name: 'go-dicom show',
        where: 'go-dicom',
        what: 'Prints every element of a file, one per line.',
        firstMet: '1.1 Open the File',
        deepenedIn: ['1.3 The Transfer Syntax'],
      },
      {
        name: 'xxd',
        where: 'Linux shell',
        what: "Prints a file's bytes in hexadecimal.",
        firstMet: '1.1 Open the File',
        deepenedIn: [],
      },
    ])
  })

  it('links each word to its card', () => {
    expect(glossaryRowsOf(CODEX.glossary)[0]).toMatchObject({ term: 'the preamble', href: '#/codex/preamble' })
  })

  it('links a source path into the pinned release', () => {
    expect(goDicomSourceUrl('/cli/show.go')).toBe(`${GO_DICOM}cli/show.go`)
  })
})
