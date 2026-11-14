# Concepts: stages 1 to 3 and the Bridge

Every concept a mission of 0.1.0 teaches, names or uses, in play order. It is the source for
`packages/missions/content/concepts.yaml`. A mission **teaches** at most three concepts; it
may **name** one that a later mission teaches; it **uses** only what an earlier mission
taught. No concept is used before it is taught, none is taught twice, and every concept of
stages 1 and 2 is used again by a later mission.

The `part` says where a concept sits, from the content schema's `CONCEPT_PARTS`. 0.1.0 uses
six of the nine:

| Part                | Holds                                                                      |
| ------------------- | -------------------------------------------------------------------------- |
| `foundations`       | what DICOM is, bytes, hex, offsets, UIDs                                   |
| `file-format`       | Part 10: the preamble, the prefix, the File Meta Information, the Data Set |
| `encoding`          | how elements are written: tags, VRs, lengths, transfer syntaxes, sequences |
| `information-model` | patient, study, series, instance; SOP Classes and IODs                     |
| `pixel-data`        | the pixel elements and how stored values become a picture                  |
| `dimse`             | DIMSE messages and their Command Set, as the Bridge shows them             |

Mission numbers are the stage and the place in it: 1.4 is stage 1's fourth mission, B.1 the
Bridge's first. The missions are specified in
[stage-1-the-first-file.md](stage-1-the-first-file.md),
[stage-2-the-elements.md](stage-2-the-elements.md),
[stage-3-the-object.md](stage-3-the-object.md) and
[bridge-on-disk-and-on-the-wire.md](bridge-on-disk-and-on-the-wire.md).

## Taught in 0.1.0

| Id                           | Term                                               | Part                | Taught | Builds on                                                | Named in      | Used in                           |
| ---------------------------- | -------------------------------------------------- | ------------------- | ------ | -------------------------------------------------------- | ------------- | --------------------------------- |
| `dicom`                      | DICOM, the standard                                | `foundations`       | 1.1    | nothing                                                  |               | 1.3                               |
| `dicom-file`                 | a DICOM file holds one object                      | `file-format`       | 1.1    | `dicom`                                                  |               | 1.2, 1.3                          |
| `data-element`               | an element: a numbered entry with a value          | `encoding`          | 1.1    | `dicom-file`                                             |               | 1.2, 1.4, 2.1, 3.1                |
| `byte-and-hex`               | bytes, written as two hex digits                   | `foundations`       | 1.2    | nothing                                                  |               | 1.3, 2.1                          |
| `offset`                     | a byte's position from the start of the file       | `foundations`       | 1.2    | `byte-and-hex`                                           |               | 1.3, 1.4, 2.1, 2.2, 2.3           |
| `text-in-bytes`              | text values readable one byte per character        | `foundations`       | 1.2    | `byte-and-hex`                                           |               | 1.3                               |
| `part-10-file`               | the DICOM File Format, PS3.10                      | `file-format`       | 1.3    | `dicom-file`, `offset`                                   |               | 1.4, 1.6                          |
| `preamble`                   | the 128-byte preamble                              | `file-format`       | 1.3    | `part-10-file`                                           | 1.2           | 1.6                               |
| `dicm-prefix`                | the `DICM` prefix                                  | `file-format`       | 1.3    | `part-10-file`, `text-in-bytes`                          | 1.2           | 1.4, 1.6                          |
| `file-meta-information`      | the File Meta Information, group 0002              | `file-format`       | 1.4    | `part-10-file`, `data-element`                           | 1.3           | 1.5, 1.6, 2.6, 3.4, B.1           |
| `group-length`               | (0002,0000), the group's length                    | `file-format`       | 1.4    | `file-meta-information`, `offset`                        |               | 1.5, 1.6, 2.3                     |
| `data-set`                   | the Data Set, the object itself                    | `file-format`       | 1.4    | `part-10-file`                                           | 1.3           | 1.5, 1.6, B.1                     |
| `transfer-syntax`            | the transfer syntax and its UID                    | `encoding`          | 1.5    | `file-meta-information`, `data-set`                      | 1.1, 1.4      | 1.6, 2.2, 2.5, 2.6, B.2           |
| `uid`                        | a UID                                              | `foundations`       | 1.5    | nothing                                                  |               | 1.6, 3.1–3.4                      |
| `little-endian`              | little endian                                      | `encoding`          | 1.5    | `byte-and-hex`, `group-length`                           |               | 2.1, 2.2, 3.6                     |
| `tag`                        | a tag, (group,element)                             | `encoding`          | 2.1    | `data-element`, `little-endian`                          | 1.1           | 2.2, 2.3, 2.5, 2.7, 2.8, 3.1, B.1 |
| `tag-order`                  | elements in increasing tag order                   | `encoding`          | 2.1    | `tag`                                                    |               | 2.2                               |
| `data-dictionary`            | the data dictionary, PS3.6                         | `encoding`          | 2.1    | `tag`                                                    |               | 2.4, 2.5, 2.8, 3.4                |
| `vr`                         | the Value Representation                           | `encoding`          | 2.2    | `tag`, `data-dictionary`                                 | 1.1, 1.5      | 2.3–2.5, 2.7, 2.8                 |
| `value-length`               | value length                                       | `encoding`          | 2.2    | `vr`, `little-endian`                                    |               | 2.3–2.5, 2.7, 2.8, 3.5            |
| `value-padding`              | padding to an even length                          | `encoding`          | 2.2    | `value-length`, `text-in-bytes`                          |               | 2.8                               |
| `long-form`                  | the long form: reserved bytes and a 4-byte length  | `encoding`          | 2.3    | `vr`, `value-length`                                     | 2.2           | 2.5–2.8, 3.5                      |
| `binary-vr`                  | OB and OW                                          | `encoding`          | 2.3    | `vr`                                                     |               | 3.5                               |
| `value-multiplicity`         | VM and the `\` delimiter                           | `encoding`          | 2.4    | `vr`, `data-dictionary`                                  |               | 2.8                               |
| `explicit-vr`                | explicit VR                                        | `encoding`          | 2.5    | `vr`, `transfer-syntax`                                  | 1.5           | 2.6, 2.7, B.2                     |
| `implicit-vr`                | implicit VR                                        | `encoding`          | 2.5    | `explicit-vr`, `data-dictionary`                         | 1.5, 1.6      | 2.6, 2.8, B.2                     |
| `default-transfer-syntax`    | Implicit VR Little Endian, the default             | `encoding`          | 2.5    | `implicit-vr`, `transfer-syntax`                         | 1.6           | B.2                               |
| `same-object-other-bytes`    | one object, two encodings                          | `encoding`          | 2.6    | `explicit-vr`, `implicit-vr`, `long-form`                |               | B.2                               |
| `file-meta-always-explicit`  | the File Meta Information is always Explicit VR LE | `file-format`       | 2.6    | `file-meta-information`, `explicit-vr`                   |               | B.3                               |
| `sequence`                   | a sequence, SQ                                     | `encoding`          | 2.7    | `long-form`, `vr`                                        | 2.3           | 2.8                               |
| `item`                       | an item, (FFFE,E000)                               | `encoding`          | 2.7    | `sequence`, `tag`                                        |               | 2.8                               |
| `undefined-length`           | undefined length and the delimitation items        | `encoding`          | 2.7    | `value-length`, `item`                                   |               | 2.8                               |
| `information-model`          | patient, study, series, instance                   | `information-model` | 3.1    | `uid`                                                    |               | 3.2, 3.7                          |
| `study`                      | a study                                            | `information-model` | 3.1    | `information-model`                                      |               | 3.2, 3.3                          |
| `study-instance-uid`         | Study Instance UID (0020,000D)                     | `information-model` | 3.1    | `study`, `uid`, `tag`                                    |               | 3.2, 3.7                          |
| `series`                     | a series                                           | `information-model` | 3.2    | `study`                                                  | 3.1           | 3.3                               |
| `series-instance-uid`        | Series Instance UID (0020,000E)                    | `information-model` | 3.2    | `series`, `study-instance-uid`                           |               | 3.7                               |
| `uid-not-number`             | UIDs identify; numbers only order                  | `information-model` | 3.2    | `uid`                                                    |               | 3.3                               |
| `sop-instance-uid`           | SOP Instance UID (0008,0018)                       | `information-model` | 3.3    | `series-instance-uid`, `uid-not-number`                  | 1.1, 2.6, 3.1 | 3.4, 3.7, B.1, B.3                |
| `instance-number`            | Instance Number (0020,0013)                        | `information-model` | 3.3    | `uid-not-number`                                         |               |                                   |
| `uid-root`                   | a UID's root; `1.2.840.10008`, `2.25`              | `foundations`       | 3.3    | `uid`                                                    |               |                                   |
| `sop-class`                  | the SOP Class and its UID                          | `information-model` | 3.4    | `sop-instance-uid`                                       | 3.3           | 3.5, 3.7, B.1                     |
| `iod`                        | the IOD                                            | `information-model` | 3.4    | `sop-class`                                              |               |                                   |
| `media-storage-uids`         | (0002,0002) and (0002,0003)                        | `file-format`       | 3.4    | `file-meta-information`, `sop-class`, `sop-instance-uid` | 1.4           | B.1, B.3                          |
| `rows-columns`               | Rows and Columns                                   | `pixel-data`        | 3.5    | `sop-class`                                              |               | 3.7                               |
| `photometric-interpretation` | Photometric Interpretation                         | `pixel-data`        | 3.5    | `rows-columns`                                           |               | 3.6, 3.7                          |
| `pixel-data`                 | Pixel Data (7FE0,0010) and its length              | `pixel-data`        | 3.5    | `binary-vr`, `long-form`, `rows-columns`                 | 1.1, 2.3      | 3.6                               |
| `bits-allocated-stored`      | Bits Allocated, Bits Stored, High Bit              | `pixel-data`        | 3.6    | `pixel-data`                                             | 3.5           |                                   |
| `pixel-representation`       | Pixel Representation, unsigned or signed           | `pixel-data`        | 3.6    | `bits-allocated-stored`                                  |               |                                   |
| `rescale`                    | Rescale Slope and Intercept, Hounsfield units      | `pixel-data`        | 3.6    | `pixel-data`                                             |               | 3.7                               |
| `dimse-message`              | a DIMSE message: Command Set and Data Set          | `dimse`             | B.1    | `data-set`                                               |               | B.2                               |
| `command-set`                | the Command Set, group 0000                        | `dimse`             | B.1    | `dimse-message`, `tag`, `sop-instance-uid`               |               | B.2, B.3                          |
| `file-meta-stays-home`       | the File Meta Information is never sent            | `dimse`             | B.1    | `file-meta-information`, `command-set`                   |               | B.2, B.3                          |
| `negotiated-transfer-syntax` | the transfer syntax accepted for a context         | `dimse`             | B.2    | `transfer-syntax`, `dimse-message`                       |               | B.3                               |
| `command-set-encoding`       | the Command Set is always Implicit VR LE           | `dimse`             | B.2    | `command-set`, `implicit-vr`                             |               |                                   |
| `stored-encoding`            | the receiver chooses the file's transfer syntax    | `dimse`             | B.2    | `same-object-other-bytes`, `file-meta-stays-home`        |               | B.3                               |

## Named here, taught later

| Id                     | Term                         | Part                | Named in | Taught in                      |
| ---------------------- | ---------------------------- | ------------------- | -------- | ------------------------------ |
| `private-tag`          | private elements, odd groups | `encoding`          | 2.1      | no mission yet (see Gaps)      |
| `window`               | Window Center and Width      | `pixel-data`        | 3.6      | no mission yet (see Gaps)      |
| `storage-service`      | the Storage Service Class    | `information-model` | 3.4      | stage 4, Echo, then store      |
| `ae`                   | an application entity        | `association`       | B.1      | stage 4, AE titles and roles   |
| `ae-title`             | an AE title                  | `association`       | B.1      | stage 4, AE titles and roles   |
| `scu-scp`              | the SCU and SCP roles        | `association`       | B.1      | stage 4, AE titles and roles   |
| `association`          | an association               | `association`       | B.1      | stage 4, AE titles and roles   |
| `presentation-context` | a presentation context       | `association`       | B.1, B.2 | stage 4, Presentation contexts |
| `pdu`                  | a PDU                        | `association`       | B.1      | stage 4, Presentation contexts |
| `c-store`              | C-STORE                      | `dimse`             | B.1      | stage 4, Echo, then store      |

## Gaps

- **Taught and never used again, in stage 3 and the Bridge:** `instance-number`, `uid-root`,
  `iod`, `bits-allocated-stored`, `pixel-representation`, `command-set-encoding`. They are
  outside the first two stages, so the concept test does not require it, but stage 4 or a
  later capstone should use them: `iod` and `command-set-encoding` fit stage 4's C-STORE
  mission; the pixel ones fit stage 6's compressed syntaxes.
- **Named with no teaching mission:** `private-tag` (no fixture holds a private element, and
  no region covers vendors' elements) and `window` (shown, never required). Both belong to
  `KNOWN_CONCEPT_GAPS` until a mission teaches them.
- **De-identification.** The proposal lists `anonymize` and `share` among the CLI commands
  and the `absent` check, but no region of stages 1–6 teaches de-identification (PS3.15).
  0.1.0 has no mission for it.
- **The Bridge names seven stage 4 concepts.** It cannot send an instance without an
  association, so it names them in one plain line each and relies on none; stage 4 must
  teach every one and use the Bridge's evidence as its starting point.
- **Fixture-dependent concepts.** `undefined-length` (2.7) needs an undefined length in the
  fixture; `value-padding`'s Predict (2.2) needs an odd-length text value; 3.3 and 3.7 need a
  copy of our instance inside `series/`. Each is marked `[verify]` in its spec.
