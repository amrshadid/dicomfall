import { describe, expect, it } from 'vitest'
import { readMachineFile } from '#services/vm/vm-read.service'
import type { ControlReply } from '#types/definitions/vm'

const reply = (status: number, output: string) => async (): Promise<ControlReply> => ({ status, output })

describe('a file read as root', () => {
  it('comes back as its bytes', async () => {
    expect(await readMachineFile(reply(0, 'RElDTQ==\n'), '/lab/x.dcm')).toEqual({
      ok: true,
      value: new TextEncoder().encode('DICM'),
    })
  })

  it('fails with what the Machine said when the file is missing or too large', async () => {
    expect(await readMachineFile(reply(1, 'not a regular file\n'), '/lab/x.dcm')).toEqual({
      ok: false,
      errors: ['/lab/x.dcm: not a regular file'],
    })
    expect(await readMachineFile(reply(-1, ''), '/lab/x.dcm')).toEqual({
      ok: false,
      errors: ['/lab/x.dcm: could not be read (status -1)'],
    })
  })

  it('never sends a path that is not absolute', async () => {
    const sent: string[] = []
    const result = await readMachineFile(async (line) => {
      sent.push(line)
      return { status: 0, output: '' }
    }, 'x.dcm')
    expect(result.ok).toBe(false)
    expect(sent).toEqual([])
  })

  it('fails on a reply that is not base64', async () => {
    expect((await readMachineFile(reply(0, 'not base64!'), '/lab/x.dcm')).ok).toBe(false)
  })
})
