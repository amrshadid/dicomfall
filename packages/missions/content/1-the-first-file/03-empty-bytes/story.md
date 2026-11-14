# 128 Empty Bytes

**Question:** Where does a DICOM file start, and how does a reader know it is one?

## Scene

> **The Preamble:** Time I spoke about myself. I am 128 bytes, and in this file every one of me is zero. I am still required: every Part 10 file starts with me. Everything in it has its place, and mine is first. Find me, then find the four bytes that come after me, the ones every reader checks. Being nothing is a job too, and I do it well.

## See it

> **The Preamble:** Type `hexdump -C /lab/ct-explicit-le.dcm | head -n 10`. The `-n 10` asks `head` for ten lines.

---

```recorded hexdump -C /lab/ct-explicit-le.dcm | head -n 10
00000000  00 00 00 00 00 00 00 00  00 00 00 00 00 00 00 00  |................|
*
00000080  44 49 43 4d 02 00 00 00  55 4c 04 00 b8 00 00 00  |DICM....UL......|
00000090  02 00 01 00 4f 42 00 00  02 00 00 00 00 01 02 00  |....OB..........|
000000a0  02 00 55 49 1a 00 31 2e  32 2e 38 34 30 2e 31 30  |..UI..1.2.840.10|
000000b0  30 30 38 2e 35 2e 31 2e  34 2e 31 2e 31 2e 32 00  |008.5.1.4.1.1.2.|
000000c0  02 00 03 00 55 49 2c 00  32 2e 32 35 2e 32 35 31  |....UI,.2.25.251|
000000d0  38 38 36 32 36 36 32 31  31 30 33 36 37 33 39 36  |8862662110367396|
000000e0  31 32 37 37 35 30 33 34  33 37 32 31 36 34 36 34  |1277503437216464|
000000f0  33 33 30 36 02 00 10 00  55 49 14 00 31 2e 32 2e  |3306....UI..1.2.|
```

> **The Preamble:** The first row is sixteen `00` bytes, then a `*`: hexdump's way of saying the rows up to the next offset it prints repeat it. The next offset is `00000080`. In hex, `80` is eight sixteens: 128. So offsets 0 to 127 are all `00`, eight rows of sixteen. That is me, the _preamble_.

> **The Preamble:** At offset 128, four bytes: `44 49 43 4d`, and the right-hand column reads `DICM`. That is the _DICM prefix_, offsets 128 to 131. Those letters, not the file's name, say it is DICOM.

> **The Preamble:** This order is the _Part 10 file_, the DICOM File Format of PS3.10 §7. It has four regions: the preamble, the prefix, then the File Meta Information, where the file describes itself, then the Data Set, the object. PS3.10 counts the preamble and prefix as part of the File Meta Information; here that name means the group 0002 elements alone. The File inspector draws the four as bands. The first two never move. The File Meta Information always starts right after, at 132; where it ends, and so where the Data Set starts, depends on the file.

## Build it

> **The Preamble:** In the File inspector's hex pane, drag from offset 0 to offset 127, so that exactly those 128 bytes are marked. The last byte you want is the last one of the row `00000070`.

---

> **The Preamble:** That band is me. 128 bytes that start at offset 0 end at offset 127, because the first byte is at 0. Now mark the four bytes from offset 128 to 131, the first four of the row `00000080`.

---

> **The Preamble:** Two bands found, and both are fixed: in every Part 10 file, the preamble starts at 0 and the prefix at 128. A reader checks those four bytes before it reads anything else.

## Watch it

> **The Preamble:** Why would a file start with 128 bytes that DICOM never reads?
>
> - padding, so the file loads faster
> - [x] room for another program's own use, so one file can serve both
> - a checksum of everything after it

---

> **The Preamble:** PS3.10 §7.1 leaves the preamble to an application profile or an implementation. A writer can put another format's opening there, so a program that expects that format can read the same file. Unused, all 128 bytes are `00`, as here. Used or not, a DICOM reader skips me whatever I hold, and never takes me for part of the object.

## Debrief

> **The Preamble:** A reader skips 128 bytes and checks for `DICM`; without those letters, the file is not a Part 10 file. After them, the file describes itself. The Envelope reads that description, and finds where the object begins.

## Real world

On your own machine, the first 132 bytes of any DICOM file:

```
head -c 132 ct.dcm | hexdump -C
```

`head -c 132` keeps the first 132 bytes. A file that shows no `DICM` at offset 128 is not a Part 10 file, whatever its name ends in.
