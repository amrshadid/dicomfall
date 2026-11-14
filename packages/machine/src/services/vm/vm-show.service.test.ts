import { describe, expect, it } from 'vitest'
import { readMachineShow } from '#services/vm/vm-show.service'
import { CT_EXPLICIT_LE_SHOW_JSON } from '#test/show-json/index'
import type { ControlReply } from '#types/definitions/vm'

/** A control channel that answers every line with `reply` and keeps what it was sent. */
function channel(reply: ControlReply) {
  const sent: string[] = []
  return {
    sent,
    control: async (line: string): Promise<ControlReply> => {
      sent.push(line)
      return reply
    },
  }
}

describe("go-dicom's reading of a file, as root", () => {
  it('comes back as the parsed tree, whatever go-dicom wrote on stderr', async () => {
    const { control, sent } = channel({ status: 0, output: `${CT_EXPLICIT_LE_SHOW_JSON}__DF_STDERR__\nsome warning\n` })
    const reading = await readMachineShow(control, '/lab/ct-explicit-le.dcm')
    expect(reading.ok && reading.value.dataSet.length).toBe(61)
    expect(sent[0]).toContain(`/usr/local/bin/go-dicom show '/lab/ct-explicit-le.dcm' --json`)
    expect(sent[0]).not.toContain('ip netns exec')
  })

  it('runs in the AE whose receive folder holds the file, or the AE it is told', async () => {
    const { control, sent } = channel({ status: 0, output: `${CT_EXPLICIT_LE_SHOW_JSON}__DF_STDERR__\n` })
    await readMachineShow(control, '/lab/archive/received/1.2.dcm')
    await readMachineShow(control, '/lab/ct-explicit-le.dcm', 'workstation')
    expect(sent[0]).toContain(`ip netns exec 'archive' /usr/local/bin/go-dicom show`)
    expect(sent[1]).toContain(`ip netns exec 'workstation' /usr/local/bin/go-dicom show`)
  })

  it("fails with go-dicom's own words when it refuses the file", async () => {
    const { control } = channel({ status: 1, output: '__DF_STDERR__\nError: not a DICOM file\n' })
    expect(await readMachineShow(control, '/lab/notes.txt')).toEqual({
      ok: false,
      errors: ['/lab/notes.txt: Error: not a DICOM file'],
    })
  })

  it('refuses a file go-dicom read no element from, as its text form does, with its warnings', async () => {
    // The shape go-dicom 1.9.0 printed on the Machine for `go-dicom show /etc/hostname --json`.
    const empty = JSON.stringify({
      schemaVersion: 1,
      file: '/etc/hostname',
      size: 10,
      preamble: false,
      regions: [{ name: 'dataSet', offset: 0, endOffset: 10 }],
      transferSyntax: { uid: '', explicitVR: false, littleEndian: true, deflated: false },
      offsetsRelativeTo: 'file',
      fileMeta: [],
      dataSet: [],
      warnings: ['no file meta header; parsing as a raw data set in implicit VR little endian'],
    })
    const { control } = channel({ status: 0, output: `${empty}__DF_STDERR__\n` })
    expect(await readMachineShow(control, '/etc/hostname')).toEqual({
      ok: false,
      errors: [
        '/etc/hostname: go-dicom read no element from it (no file meta header; parsing as a raw data set in implicit VR little endian)',
      ],
    })
  })

  it('fails on a reply of another schema, naming the file', async () => {
    const other = CT_EXPLICIT_LE_SHOW_JSON.replace('"schemaVersion": 1', '"schemaVersion": 3')
    const { control } = channel({ status: 0, output: `${other}__DF_STDERR__\n` })
    const reading = await readMachineShow(control, '/lab/ct-explicit-le.dcm')
    expect(reading.ok ? [] : reading.errors).toEqual([
      expect.stringMatching(/^\/lab\/ct-explicit-le\.dcm: .*schemaVersion 3/),
    ])
  })

  it('never sends a path that is not absolute', async () => {
    const { control, sent } = channel({ status: 0, output: '' })
    expect((await readMachineShow(control, 'ct.dcm')).ok).toBe(false)
    expect(sent).toEqual([])
  })
})
