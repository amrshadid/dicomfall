// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CT_EXPLICIT_READING, ctExplicitBytes } from '@/test/fixtures/show-reading.fixture'
import { LightboxImageContainer } from './LightboxImageContainer'
import { UidTrailContainer } from './UidTrailContainer'

const mocks = vi.hoisted(() => ({ preview: vi.fn() }))

vi.mock('@features/lightbox/hooks/preview', () => ({
  usePreviewImage: (path: string | null, key: string | null) => {
    mocks.preview(path, key)
    return { phase: path === null ? 'idle' : 'ready', url: path === null ? null : 'blob:png', errors: [] }
  },
}))

beforeEach(() => mocks.preview.mockClear())
afterEach(cleanup)

const FILE = '/lab/ct-explicit-le.dcm'

describe('LightboxImageContainer', () => {
  it('renders the file the inspector shows, keyed by its bytes', () => {
    const bytes = ctExplicitBytes()
    render(<LightboxImageContainer file={FILE} reading={{ phase: 'ready', reading: CT_EXPLICIT_READING, bytes }} />)
    expect(mocks.preview).toHaveBeenLastCalledWith(FILE, expect.stringMatching(/^9648:/))
    expect(screen.getByRole('img').getAttribute('src')).toBe('blob:png')
  })

  it('renders nothing for a file without Pixel Data, and says so', () => {
    const reading = { ...CT_EXPLICIT_READING, dataSet: [] }
    render(<LightboxImageContainer file={FILE} reading={{ phase: 'ready', reading, bytes: ctExplicitBytes() }} />)
    expect(mocks.preview).toHaveBeenLastCalledWith(null, null)
    expect(screen.getByRole('status').textContent).toContain('no Pixel Data')
  })
})

describe('UidTrailContainer', () => {
  it("reads the UID trail from go-dicom's reading of the file", () => {
    render(<UidTrailContainer file={FILE} reading={{ reading: CT_EXPLICIT_READING }} />)
    expect(screen.getByText('2.25.244689099060892268776675746833514200113')).toBeTruthy()
  })
})
