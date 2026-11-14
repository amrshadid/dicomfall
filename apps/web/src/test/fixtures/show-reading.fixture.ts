import type { ShowReading } from '@dicomfall/machine/types'

// Elements picked from a real `go-dicom show /lab/ct-explicit-le.dcm --json` (go-dicom 1.9.0, the
// machine package's recorded fixture): every offset is go-dicom's. The others are left out, so
// the File Meta Information and the Data Set here have gaps the real file has not.

const element = (
  tag: string,
  name: string,
  vr: string,
  value: string | undefined,
  tagOffset: number,
  valueLength: number,
  lengthSize = 2
) => {
  const vrOffset = tagOffset + 4
  const lengthOffset = vrOffset + (lengthSize === 4 ? 4 : 2)
  const valueOffset = lengthOffset + lengthSize
  return {
    tag,
    keyword: name.replaceAll(/[^A-Za-z]/g, ''),
    name,
    vr,
    vm: 1,
    ...(value === undefined ? {} : { value }),
    tagOffset,
    vrOffset,
    lengthOffset,
    lengthSize,
    valueOffset,
    valueLength,
    undefinedLength: false,
    endOffset: valueOffset + valueLength,
  }
}

export const CT_EXPLICIT_READING: ShowReading = {
  schemaVersion: 1,
  file: '/lab/ct-explicit-le.dcm',
  size: 9648,
  preamble: true,
  regions: [
    { name: 'preamble', offset: 0, endOffset: 128 },
    { name: 'prefix', offset: 128, endOffset: 132 },
    { name: 'fileMeta', offset: 132, endOffset: 328 },
    { name: 'dataSet', offset: 328, endOffset: 9648 },
  ],
  transferSyntax: { uid: '1.2.840.10008.1.2.1', explicitVR: true, littleEndian: true, deflated: false },
  offsetsRelativeTo: 'file',
  fileMeta: [
    element('(0002,0000)', 'File Meta Information Group Length', 'UL', '184', 132, 4),
    element('(0002,0001)', 'File Meta Information Version', 'OB', undefined, 144, 2, 4),
    element('(0002,0010)', 'Transfer Syntax UID', 'UI', '1.2.840.10008.1.2.1', 244, 20),
  ],
  dataSet: [
    element('(0008,0005)', 'Specific Character Set', 'CS', 'ISO_IR 100', 328, 10),
    element('(0008,0018)', 'SOP Instance UID', 'UI', '2.25.251886266211036739612775034372164643306', 440, 44),
    element('(0008,0060)', 'Modality', 'CS', 'CT', 628, 2),
    {
      ...element('(0008,1032)', 'Procedure Code Sequence', 'SQ', undefined, 754, 76, 4),
      items: [
        {
          tag: '(FFFE,E000)',
          tagOffset: 766,
          lengthOffset: 770,
          lengthSize: 4,
          valueOffset: 774,
          valueLength: 68,
          undefinedLength: false,
          endOffset: 842,
          elements: [
            element('(0008,0100)', 'Code Value', 'SH', 'DF-CT-PHANTOM', 774, 14),
            element('(0008,0102)', 'Coding Scheme Designator', 'SH', '99DFALL', 796, 8),
            element('(0008,0104)', 'Code Meaning', 'LO', 'CT phantom, synthetic', 812, 22),
          ],
        },
      ],
    },
    element('(0010,0010)', "Patient's Name", 'PN', 'FALLS^DICOM', 878, 12),
    element('(0020,000D)', 'Study Instance UID', 'UI', '2.25.244689099060892268776675746833514200113', 1032, 44),
    element('(0020,000E)', 'Series Instance UID', 'UI', '2.25.262811267488977860285166554097588707013', 1084, 44),
    element('(0028,0004)', 'Photometric Interpretation', 'CS', 'MONOCHROME2', 1296, 12),
    element('(0028,0010)', 'Rows', 'US', '64', 1316, 2),
    element('(0028,0011)', 'Columns', 'US', '64', 1326, 2),
    element('(0028,0100)', 'Bits Allocated', 'US', '16', 1348, 2),
    element('(7FE0,0010)', 'Pixel Data', 'OW', undefined, 1444, 8192, 4),
  ],
  warnings: [],
}

/** The file's bytes for the hex pane: the preamble's zeros and `DICM`, then filler. Only the length and the first 132 bytes are the real file's. */
export function ctExplicitBytes(): Uint8Array {
  const bytes = new Uint8Array(CT_EXPLICIT_READING.size)
  bytes.set([0x44, 0x49, 0x43, 0x4d], 128)
  for (let at = 132; at < bytes.length; at++) {
    bytes[at] = at % 251
  }
  return bytes
}
