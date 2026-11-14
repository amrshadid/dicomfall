// @vitest-environment jsdom
import { pixelFactsOf, uidTrailOf } from '@features/lightbox/utils/reading'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { CT_EXPLICIT_READING } from '@/test/fixtures/show-reading.fixture'
import { LightboxImagePresentation } from './LightboxImagePresentation'
import { UidTrailPresentation } from './UidTrailPresentation'

afterEach(cleanup)

const FILE = '/lab/ct-explicit-le.dcm'
const FACTS = pixelFactsOf(CT_EXPLICIT_READING)

describe('LightboxImagePresentation', () => {
  it("shows go-dicom's rendering with Rows, Columns, Bits Allocated and Photometric Interpretation", () => {
    render(<LightboxImagePresentation file={FILE} phase="ready" url="blob:png" errors={[]} facts={FACTS} />)
    const image = screen.getByRole('img')
    expect(image.getAttribute('src')).toBe('blob:png')
    expect(image.getAttribute('alt')).toBe(
      "go-dicom's rendering of /lab/ct-explicit-le.dcm: 64 rows by 64 columns, MONOCHROME2."
    )
    expect(screen.getByRole('heading', { name: /Image/ }).textContent).toContain('64 × 64')
    expect(screen.getByText('Bits Allocated').closest('div')?.textContent).toContain('16')
    expect(screen.getByText('MONOCHROME2')).toBeTruthy()
  })

  it('says why there is no image: rendering, no Pixel Data, or go-dicom refused', () => {
    render(<LightboxImagePresentation file={FILE} phase="rendering" url={null} errors={[]} facts={FACTS} />)
    expect(screen.getByRole('status').textContent).toContain('rendering')
    cleanup()
    render(<LightboxImagePresentation file={FILE} phase="no-pixels" url={null} errors={[]} facts={[]} />)
    expect(screen.getByRole('status').textContent).toContain('no Pixel Data')
    cleanup()
    render(
      <LightboxImagePresentation file={FILE} phase="failed" url={null} errors={['convert: bad file']} facts={[]} />
    )
    expect(screen.getByRole('alert').textContent).toContain('could not render')
    expect(screen.getByText('convert: bad file')).toBeTruthy()
  })

  it('keeps its words before the lab is built', () => {
    render(<LightboxImagePresentation file={null} phase="idle" url={null} errors={[]} facts={[]} />)
    expect(screen.getByText(/The image preview opens when the Machine is ready/)).toBeTruthy()
    expect(screen.queryByRole('img')).toBeNull()
  })
})

describe('UidTrailPresentation', () => {
  it('lists Study, Series and SOP Instance UID on disk, and keeps the wire side honest', () => {
    render(<UidTrailPresentation file={FILE} uids={uidTrailOf(CT_EXPLICIT_READING)} />)
    expect(screen.getByRole('heading', { name: /On disk/ }).textContent).toContain(FILE)
    const steps = screen.getAllByRole('listitem')
    expect(steps.map((step) => step.textContent?.split(' (')[0])).toEqual([
      'Study Instance UID',
      'Series Instance UID',
      'SOP Instance UID',
    ])
    expect(screen.getByText('2.25.251886266211036739612775034372164643306')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'On the wire' })).toBeTruthy()
    expect(screen.getByText(/Nothing has crossed the wire yet/)).toBeTruthy()
  })

  it('keeps its words before the file is read', () => {
    render(<UidTrailPresentation file={null} uids={null} />)
    expect(screen.getByText(/The UID trail opens when the Machine is ready/)).toBeTruthy()
  })
})
