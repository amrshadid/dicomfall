# A Second File

**Question:** Can you map a file you have never opened: its four regions and its transfer syntax?

## Scene

> **The Preamble:** A second file came in with the first: `/lab/ct-implicit-le.dcm`. Whoever sent it says it is the same slice. Perhaps. Before anyone trusts it, you map it, the way you mapped the first: four regions, and the rules its Data Set is written by. This time I only point at the door. Its name says implicit, but a name proves nothing; the bytes do.

## See it

> **The Preamble:** Ask go-dicom for its summary: `go-dicom info /lab/ct-implicit-le.dcm`.

---

```recorded go-dicom info /lab/ct-implicit-le.dcm
=== DICOM File Information ===
File:         /lab/ct-implicit-le.dcm
Size:         9638 bytes
Modified:     1970-01-01 00:00:00

Key DICOM Elements:
─────────────────────────────────────
Patient Name:    FALLS^DICOM
Patient ID:      DF-0001
Study Date:      20260105
Modality:        CT
Study Desc:      Synthetic phantom
Series Desc:     Axial phantom

Image Dimensions:
─────────────────────────────────────
Rows:            64
Columns:         64
```

> **The Preamble:** The same patient, the same modality, the same 64 by 64 picture. `info` reports the elements' values, not their bytes, so it agrees whenever the values agree. Now compare the sizes: `ls -l /lab`.

---

```recorded ls -l /lab
total 20
-rw-r--r--    1 root     root          9648 Jan  1  1970 ct-explicit-le.dcm
-rw-r--r--    1 root     root          9638 Jan  1  1970 ct-implicit-le.dcm
drwxr-xr-x    3 root     root             0 Jan  1  1970 fixtures
```

> **The Preamble:** 9648 bytes for the first file, 9638 for this one. Ten bytes gone, and apart from its Size line the summary did not change. Ten bytes is not much, yet it is enough to trip a reader that applies one file's rules to another. The same values, written as different bytes: somewhere, this file follows other rules. A file's name and its summary can both look right while its bytes say something else, which is why an engineer maps a file before trusting it. The map starts at offset 0, as always: `hexdump -C /lab/ct-implicit-le.dcm | head -n 10`.

---

```recorded hexdump -C /lab/ct-implicit-le.dcm | head -n 10
00000000  00 00 00 00 00 00 00 00  00 00 00 00 00 00 00 00  |................|
*
00000080  44 49 43 4d 02 00 00 00  55 4c 04 00 b6 00 00 00  |DICM....UL......|
00000090  02 00 01 00 4f 42 00 00  02 00 00 00 00 01 02 00  |....OB..........|
000000a0  02 00 55 49 1a 00 31 2e  32 2e 38 34 30 2e 31 30  |..UI..1.2.840.10|
000000b0  30 30 38 2e 35 2e 31 2e  34 2e 31 2e 31 2e 32 00  |008.5.1.4.1.1.2.|
000000c0  02 00 03 00 55 49 2c 00  32 2e 32 35 2e 32 35 31  |....UI,.2.25.251|
000000d0  38 38 36 32 36 36 32 31  31 30 33 36 37 33 39 36  |8862662110367396|
000000e0  31 32 37 37 35 30 33 34  33 37 32 31 36 34 36 34  |1277503437216464|
000000f0  33 33 30 36 02 00 10 00  55 49 12 00 31 2e 32 2e  |3306....UI..1.2.|
```

> **The Preamble:** Rows of `00` folded into a `*`, then `DICM` at `00000080`. Whatever else changed, the opening did not: every Part 10 file has its preamble and `DICM` at these offsets.

## Build it

> **The Preamble:** Map `/lab/ct-implicit-le.dcm` in the File inspector: mark its preamble, its prefix, its File Meta Information and its Data Set, and give its Transfer Syntax UID beside the objective.

---

> **The Preamble:** Everything you need, you have used before. The first two regions sit where they sit in every Part 10 file. The third starts at 132 and ends where this file's group length says, so read that value, from the inspector or from its four bytes, last byte first. Then add it to 144, as in The Envelope. The UID is an element of group 0002, like the group length. Mark each region exactly: a band one byte too long or too short does not count. And mark them in this file, not the first one: the objectives name `/lab/ct-implicit-le.dcm`.

## Watch it

> **The Preamble:** This file names `1.2.840.10008.1.2`. Does its Data Set follow the first file's rules?
>
> - yes: a UID is only a label
> - [x] no: its elements carry no VR letters
> - no: its numbers are stored the other way round

---

> **The Preamble:** Its group length is 182, not 184: its UID is two bytes shorter, two of the ten; stage 2 finds the other eight in the Data Set. The Data Set starts at 326: `08 00 05 00`, the tag, then `0a 00 00 00`, a four-byte length, and no `CS` between. The first file's, at 328: `08 00 05 00 43 53 0a 00`. This is Implicit VR Little Endian, PS3.5 Annex A.1: implicit VR, the default transfer syntax every implementation must support, §10.1.

## Debrief

> **The Preamble:** Four regions, every time, and the transfer syntax decides how the rest reads. This Data Set has no VR letters at all. Stage 2, The Elements, opens one element at a time and finds out how a reader copes without them.

## Real world

On your own machine, the whole stage on any DICOM file:

```
go-dicom info ct.dcm
hexdump -C ct.dcm | head -n 10
head -c 144 ct.dcm | tail -c 4 | hexdump -C
go-dicom show ct.dcm::0002,0010
```

Preamble at 0, `DICM` at 128, the File Meta Information from 132, the Data Set from 144 plus the group length, and the Transfer Syntax UID to say how to read it.
