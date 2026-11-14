# @dicomfall/fixtures

The synthetic DICOM files DICOMFall teaches from, and the Go program that makes them. Every file
is written by [go-dicom](https://github.com/amrshadid/go-dicom) v1.8.0 and read back by both
go-dicom and pydicom, which must agree on every element.

> **Note:** no real patient data, ever. Every name, ID, date, institution, device and image here is
> made up, and the generator in this directory is the only source of the files in `out/`.

## Structure

```
main.go               → flags: -out DIR writes the fixtures, -dump FILE... prints go-dicom's reading
objects.go            → the studies, series and instances, and the attributes each instance carries
phantom.go            → the 64×64 test image (a cylinder with a bony shell and four inserts)
uid.go                → deterministic 2.25 UIDs
generate.go           → encoding with go-dicom's filewriter, and manifest.json
dump.go               → go-dicom's reading as DICOM JSON, for the cross-check
fixtures_test.go      → determinism, freshness of out/, and out/ against manifest.json
scripts/crosscheck.py → go-dicom against pydicom, element by element
out/                  → the generated files (committed, CC0)
```

## The files

| File                     | Transfer syntax                               | What it is for                                                  |
| ------------------------ | --------------------------------------------- | --------------------------------------------------------------- |
| `out/ct-explicit-le.dcm` | Explicit VR Little Endian `1.2.840.10008.1.2.1` | The CT instance the game follows: stages 1 to 3, the bridge, the DIMSE lab |
| `out/ct-implicit-le.dcm` | Implicit VR Little Endian `1.2.840.10008.1.2`   | The same object, same UIDs and values, in the other encoding (stage 2) |
| `out/series/f01–f06.dcm` | Explicit VR Little Endian                     | Six files to sort by Study and Series Instance UID (stage 3)    |
| `out/manifest.json`      |                                               | Path, SOP Class, SOP Instance, Study and Series UIDs, transfer syntax, size and SHA-256 of each file |

Every file is a Part 10 file (128-byte zero preamble, `DICM`, File Meta Information) holding one CT
Image Storage instance (`1.2.840.10008.5.1.4.1.1.2`) of about 9.6 KB: 64×64, 16 bits allocated,
12 stored, unsigned, MONOCHROME2, Rescale Intercept −1024, so stored values are HU + 1024. The
attributes cover the Patient, General Study, General Series, Frame of Reference, General Equipment,
General Image, Image Plane, Image Pixel, CT Image, VOI LUT and SOP Common modules at a sensible
minimum, with two Type 2 elements present and empty (Referring Physician's Name, Position Reference
Indicator) and one sequence, Procedure Code Sequence, whose code is from a private coding scheme
(`99DFALL`) so it never claims to be a real procedure.

### The sorting set

The file names are neutral and interleave the groups on purpose; only the UIDs inside say which
study and series a file belongs to.

| Study                                   | Series                                | Files (Instance Number) |
| --------------------------------------- | ------------------------------------- | ----------------------- |
| 2 "Synthetic phantom, follow-up", 2026-02-10 | 1 "Axial phantom", STANDARD kernel    | f02 (7), f05 (2)        |
|                                         | 2 "Axial phantom, bone", BONE kernel  | f03 (3), f06 (9)        |
| 3 "Synthetic phantom, recheck", 2026-03-12   | 1 "Axial phantom", STANDARD kernel    | f01 (12), f04 (5)       |

Series 1 and 2 of the follow-up share a Frame of Reference UID (one acquisition, reconstructed
twice). The main CT instance is in study 1 and is not part of this set.

## UIDs

Every UID is a UUID-derived UID (PS3.5 B.2): `2.25.` followed by a UUID read as an unsigned
128-bit integer in decimal. The UUIDs are RFC 9562 version 5 (name-based, SHA-1) in the URL
namespace, named `https://github.com/amrshadid/dicomfall/packages/fixtures#<key>`, where the key
names the object (`ct/sop-instance`, `series/series-a2/series`, ...). They depend on nothing but
that name: no clock, no randomness, no registered root. Dates and times are fixed values too.

## Commands

```sh
pnpm --filter @dicomfall/fixtures generate     # go run . -out out
pnpm --filter @dicomfall/fixtures test         # go vet ./... && go test ./...
pnpm --filter @dicomfall/fixtures crosscheck   # python3 -I scripts/crosscheck.py
```

Regenerating gives byte-identical files. If you change the generator, run `generate`, commit
`out/` with it, and run `test` and `crosscheck`: the tests fail when `out/` is not what the
generator makes today, and the cross-check fails on any element where go-dicom and pydicom differ.

The tests need Go 1.25 or later; the cross-check also needs Python 3 with pydicom 2.4 and NumPy.

## How the cross-check works

`go run . -dump` reads each file with go-dicom's `filereader` and renders the File Meta
Information and the data set in the DICOM JSON Model (PS3.18 Annex F) with `Dataset.ToDICOMJSON`,
plus the decoded pixel array's shape and SHA-256. `crosscheck.py` builds the same from pydicom
(`to_json_dict`, `pixel_array`) and compares them: transfer syntax, explicit or implicit VR, byte
order, preamble, and every element's tag, VR and value, sequence items included.

## go-dicom

The generator depends on `github.com/amrshadid/go-dicom v1.8.0` as published on the module proxy.
In that version `uid.CTImageStorage()` returns `1.2.840.10008.5.1.4.1.1.2.1`, which is Enhanced CT
Image Storage, so the SOP Class comes from `network.CTImageStorageSOP` instead.

## License

The generator is under the repository's license. The generated files in `out/` are CC0 1.0; see
`out/LICENSE`.
