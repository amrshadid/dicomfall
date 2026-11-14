// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { usePreviewImage } from './usePreviewImage.hook'

const mocks = vi.hoisted(() => ({
  run: vi.fn(),
  readFile: vi.fn(),
}))

vi.mock('@dicomfall/machine/hooks', () => ({
  useMachineControls: () => ({ run: mocks.run, readFile: mocks.readFile }),
}))

beforeEach(() => {
  let made = 0
  URL.createObjectURL = vi.fn(() => (made++ === 0 ? 'blob:preview' : `blob:preview-${made}`))
  URL.revokeObjectURL = vi.fn()
  mocks.run.mockResolvedValue({ status: 0, output: 'Wrote /tmp/df-preview.png\n' })
  mocks.readFile.mockResolvedValue({ ok: true, value: new Uint8Array([0x89, 0x50, 0x4e, 0x47]) })
})

afterEach(() => vi.clearAllMocks())

describe('usePreviewImage', () => {
  it("renders with go-dicom's convert as root and shows the PNG it wrote", async () => {
    const { result } = renderHook(() => usePreviewImage('/lab/ct.dcm', 'k1'))
    await waitFor(() => expect(result.current.phase).toBe('ready'))
    expect(mocks.run).toHaveBeenCalledWith(
      expect.stringContaining("go-dicom convert '/lab/ct.dcm' /tmp/df-preview.png --format png")
    )
    expect(mocks.readFile).toHaveBeenCalledWith('/tmp/df-preview.png')
    expect(result.current.url).toBe('blob:preview')
  })

  it('renders again only when the file changes, and lets the old image go', async () => {
    const { result, rerender } = renderHook(({ key }) => usePreviewImage('/lab/ct.dcm', key), {
      initialProps: { key: 'k1' },
    })
    await waitFor(() => expect(result.current.phase).toBe('ready'))
    rerender({ key: 'k1' })
    expect(mocks.run).toHaveBeenCalledTimes(1)
    rerender({ key: 'k2' })
    await waitFor(() => expect(result.current.url).toBe('blob:preview-2'))
    expect(mocks.run).toHaveBeenCalledTimes(2)
    await act(async () => {})
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:preview')
  })

  it("says go-dicom's words when it cannot render, and renders nothing without a file", async () => {
    mocks.run.mockResolvedValue({ status: 1, output: 'convert: no pixel data' })
    const { result } = renderHook(() => usePreviewImage('/lab/ct.dcm', 'k1'))
    await waitFor(() => expect(result.current.phase).toBe('failed'))
    expect(result.current.errors).toEqual(['convert: no pixel data'])
    const idle = renderHook(() => usePreviewImage(null, null))
    expect(idle.result.current.phase).toBe('idle')
  })
})
