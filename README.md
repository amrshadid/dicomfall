# DICOMFall

**Learn DICOM from the first byte to the network.**

A free, open-source browser game for developers, imaging informatics students and PACS
engineers new to DICOM. You join a fictional imaging lab and follow one synthetic CT
instance from disk into an archive. Each mission teaches one idea: inspect the evidence,
predict what will happen, act, and check the result.

It runs real [go-dicom](https://github.com/amrshadid/go-dicom) on real Linux in your
browser, with no backend and no account. All data is synthetic, and the generator is in this
repository. DICOMFall is the third game in a series, after
[Kernelfall](https://github.com/amrshadid/kernelfall) (the Linux kernel) and
[Peerfall](https://github.com/amrshadid/peerfall) (FRRouting).

> **Status:** early development, at [dicomfall.shadid.dev](https://dicomfall.shadid.dev). Stages 1
> and 2 are written, fact-checked and recorded on the Machine; their mission screen is being
> finished for the first alpha.

## What you'll learn

| Stage                | What you learn                                                             |
| -------------------- | -------------------------------------------------------------------------- |
| 1 The first file     | What DICOM describes, and how Part 10 packages a Data Set                  |
| 2 The elements       | Tags, Value Representations, lengths, explicit and implicit VR, sequences  |
| 3 The object         | Study, Series and SOP Instance UIDs, SOP Classes, the pixel attributes     |
| Bridge               | The same SOP Instance UID on disk and on the wire                          |
| 4 The association    | Application entities, AE titles, SCU and SCP roles, presentation contexts  |
| 5 Query and retrieve | C-FIND, C-GET, C-MOVE, status codes, C-STORE sub-operations                |
| 6 Interoperability   | Conformance statements, compressed transfer syntaxes, DIMSE-N and DICOMweb |

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

Code is [MIT](LICENSE). Mission text, story, Codex and art will be CC BY 4.0, and the
synthetic fixtures CC0.
