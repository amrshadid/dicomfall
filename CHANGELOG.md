# Changelog

Every change players or contributors notice. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0-alpha.1] - 2026-11-14

The first alpha: stages 1 and 2, fourteen missions, playable at
[dicomfall.shadid.dev](https://dicomfall.shadid.dev).

### Added

- **Stage 1, The First File** (six missions): what a DICOM file holds, its bytes and offsets,
  the 128-byte preamble and `DICM`, the File Meta Information and its group length, the
  Transfer Syntax UID, and a capstone on a file never opened before.
- **Stage 2, The Elements** (eight missions): tags, VR and value length, the long form,
  value multiplicity, implicit VR, the same object in two encodings, sequences and items,
  and a capstone that reads any element from its offset.
- **The Machine:** real Linux in the browser (v86), with go-dicom 1.9.0's released 32-bit
  binary. Each application entity is its own network namespace, and every output in a
  mission was recorded on it.
- **The mission screen:**
  - the Guide: story beats, live objectives with ✓ / ◐ / ✗, answer and offset boxes, and
    three hints;
  - the Console;
  - the File inspector: go-dicom's element tree beside the hex, with the Part 10 bands and
    each element's tag, VR, length and value marked;
  - the Lightbox: the CT slice as go-dicom renders it, and the instance's UIDs.
- **Missions judged by outcome**, from go-dicom's own reading of the lab's files: the bytes
  marked, the value given, the offset predicted. Never by the command typed.
- The Archive Map, the Codex with its Field Guide, the debrief, the guided tour, settings,
  shortcuts, offline play, the bigger-screen page, the 404 page and the loading sheet, as in
  Kernelfall and Peerfall.
- Synthetic fixtures: one CT instance in Explicit and Implicit VR Little Endian, and a series
  to sort by UID, generated with go-dicom and checked against pydicom. No real patient data.
- Golden runs: every mission's solutions played on the Machine and judged by its own checks.
- Microsoft Clarity session recordings, only after the player allows them.

### Security

- **The site sends security headers.** A Content-Security-Policy lets the page run only the
  site's own code, the Linux machine's WebAssembly and, once allowed, Clarity. No other site
  can frame the game, and the page asks for no camera, microphone or other device. The
  machine itself has no way to the internet, and what is typed in it changes only the
  player's own copy.

[Unreleased]: https://github.com/amrshadid/dicomfall/compare/v0.1.0-alpha.1...HEAD
[0.1.0-alpha.1]: https://github.com/amrshadid/dicomfall/releases/tag/v0.1.0-alpha.1
