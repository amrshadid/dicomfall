// @vitest-environment jsdom
import type { ByteRange } from '@dicomfall/game/types'
import type { FileInspectorProps } from '@features/inspector/types'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CT_EXPLICIT_READING, ctExplicitBytes } from '@/test/fixtures/show-reading.fixture'
import { FileInspector } from './FileInspector'

afterEach(cleanup)

const FILE = '/lab/ct-explicit-le.dcm'

function inspector(overrides: Partial<FileInspectorProps> = {}) {
  const props: FileInspectorProps = {
    files: [FILE],
    file: FILE,
    onSelectFile: vi.fn(),
    phase: 'ready',
    errors: [],
    reading: CT_EXPLICIT_READING,
    bytes: ctExplicitBytes(),
    marked: null,
    markedElsewhere: null,
    onMark: vi.fn(),
    ...overrides,
  }
  const view = render(<FileInspector {...props} />)
  return {
    ...view,
    props,
    mark: (range: ByteRange | null) => view.rerender(<FileInspector {...props} marked={range} />),
  }
}

const tree = () => screen.getByRole('list', { name: 'Elements, as go-dicom reads them' })
const byte = (offset: number) => document.querySelector<HTMLElement>(`.hex__b[data-offset="${offset}"]`)

describe('FileInspector', () => {
  it("lists go-dicom's tree with (0002,0000) and its value, beside the file's bytes", () => {
    inspector()
    expect(
      within(tree()).getByRole('button', { name: /^0002,0000 File Meta Information Group Length, 184$/ })
    ).toBeTruthy()
    expect(byte(128)?.textContent).toBe('44')
    expect(document.querySelector('.hex__offset')?.textContent).toBe('offset')
    expect(screen.getByText('Nothing marked. Select a row or a band, or drag over the bytes.')).toBeTruthy()
  })

  it("marks a row's bytes when it is selected", () => {
    const { props } = inspector()
    fireEvent.click(within(tree()).getByRole('button', { name: /^0008,0060 Modality/ }))
    expect(props.onMark).toHaveBeenCalledWith({ from: 628, to: 638 })
  })

  it('marks a region from its row in the tree or its band in the hex pane', () => {
    const { props } = inspector()
    fireEvent.click(within(tree()).getByRole('button', { name: 'Preamble, bytes 0 to 127' }))
    expect(props.onMark).toHaveBeenLastCalledWith({ from: 0, to: 128 })
    const band = document.querySelector<HTMLElement>('.hex__bandline--prefix')
    expect(band?.textContent).toContain('DICM prefix')
    fireEvent.click(band as HTMLElement)
    expect(props.onMark).toHaveBeenLastCalledWith({ from: 128, to: 132 })
  })

  it('says the marked range in offsets, and draws it on both sides', () => {
    const { mark } = inspector()
    mark({ from: 0, to: 128 })
    expect(screen.getByText(/bytes 0 to 127 \(128 bytes\)/).textContent).toContain('Preamble')
    expect(byte(0)?.classList.contains('is-marked')).toBe(true)
    expect(byte(128)?.classList.contains('is-marked')).toBe(false)
    const row = within(tree()).getByRole('button', { name: 'Preamble, bytes 0 to 127' })
    expect(row.getAttribute('aria-pressed')).toBe('true')
  })

  it('marks a range dragged over the hex, and a whole range by Shift-click', () => {
    const { props } = inspector()
    fireEvent.mouseDown(byte(2) as HTMLElement, { button: 0 })
    fireEvent.mouseOver(byte(20) as HTMLElement)
    fireEvent.mouseUp(window)
    expect(props.onMark).toHaveBeenLastCalledWith({ from: 2, to: 21 })
    fireEvent.mouseDown(byte(0) as HTMLElement, { button: 0 })
    fireEvent.mouseUp(window)
    fireEvent.mouseDown(byte(127) as HTMLElement, { button: 0, shiftKey: true })
    fireEvent.mouseUp(window)
    expect(props.onMark).toHaveBeenLastCalledWith({ from: 0, to: 128 })
  })

  it('marks with the keyboard: arrows move, Shift and an arrow marks', () => {
    const { props } = inspector()
    const pane = screen.getByRole('group', { name: "The file's bytes, sixteen to a line" })
    fireEvent.keyDown(pane, { key: 'ArrowRight' })
    fireEvent.keyDown(pane, { key: 'ArrowDown', shiftKey: true })
    expect(props.onMark).toHaveBeenLastCalledWith({ from: 1, to: 18 })
    expect(screen.getByText('byte 17 · 0x11')).toBeTruthy()
  })

  it("draws a marked element's tag, VR, length and value apart, and marks each from its button", () => {
    const { mark, props } = inspector()
    mark({ from: 628, to: 638 })
    expect(byte(628)?.classList.contains('hex__b--tag')).toBe(true)
    expect(byte(632)?.classList.contains('hex__b--vr')).toBe(true)
    expect(byte(634)?.classList.contains('hex__b--length')).toBe(true)
    expect(byte(636)?.classList.contains('hex__b--value')).toBe(true)
    const parts = screen.getByRole('group', { name: 'Parts of 0008,0060 Modality' })
    fireEvent.click(within(parts).getByRole('button', { name: 'VR, double line, bytes 632 to 633' }))
    expect(props.onMark).toHaveBeenLastCalledWith({ from: 632, to: 634 })
  })

  it('folds a sequence and its items', () => {
    inspector()
    expect(within(tree()).getByRole('button', { name: /^0008,0100 Code Value/ })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Fold 0008,1032' }))
    expect(within(tree()).queryByRole('button', { name: /^0008,0100 Code Value/ })).toBeNull()
    expect(screen.getByRole('button', { name: 'Open 0008,1032' }).getAttribute('aria-expanded')).toBe('false')
  })

  it('picks among the lab files when it has several, and says where a mark in another file is', () => {
    const { props } = inspector({
      files: [FILE, '/lab/ct-implicit-le.dcm'],
      markedElsewhere: '/lab/ct-implicit-le.dcm, bytes 0 to 127',
    })
    fireEvent.click(screen.getByRole('button', { name: 'ct-implicit-le.dcm' }))
    expect(props.onSelectFile).toHaveBeenCalledWith('/lab/ct-implicit-le.dcm')
    expect(screen.getByText(/in \/lab\/ct-implicit-le.dcm, bytes 0 to 127/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }))
    expect(props.onMark).toHaveBeenCalledWith(null)
  })

  it("says go-dicom's own words when the file cannot be read, and that it reads while it does", () => {
    inspector({ phase: 'failed', reading: null, bytes: null, errors: ['/lab/x.dcm: not a regular file'] })
    expect(screen.getByRole('alert').textContent).toContain('not a regular file')
    cleanup()
    inspector({ phase: 'loading', reading: null, bytes: null })
    expect(screen.getByRole('status').textContent).toBe(`Reading ${FILE} with go-dicom…`)
  })
})
