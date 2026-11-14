# Under the Words

**Question:** What does the file look like as bytes, and how do you find a place in it?

## Scene

> **The Preamble:** go-dicom read the file for you and printed what it found. Useful, and second-hand: you saw what go-dicom chose to show, in the form it chose. Tonight you read what go-dicom read: the bytes themselves, every one, in order. Once you can, nothing in a file is hidden from you, not even me.

## See it

> **The Preamble:** Type `hexdump -C /lab/ct-explicit-le.dcm | head`. `hexdump` prints a file's bytes, and `head` keeps the first ten lines of what it prints.

---

```recorded hexdump -C /lab/ct-explicit-le.dcm | head
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

> **The Preamble:** Every file, whatever it holds, is a row of bytes. A _byte_ is eight bits, eight ones and zeros, so it is a number from 0 to 255. hexdump writes each one in _hexadecimal_, counting in sixteens: the digits 0 to 9, then `a` to `f` for ten to fifteen. Two digits cover every byte, from `00` to `ff`: `0a` is ten, `10` is sixteen, `ff` is 255.

> **The Preamble:** The first column is the _offset_: where the line's first byte sits, counted from the start of the file, from 0, and written in hex too. Each line holds sixteen bytes, so the offsets go `00000000`, `00000010`, `00000020`. The right-hand column shows each byte as a character where it is one, and a `.` where it is not.

> **The Preamble:** The first rows are all `00`, and hexdump folds repeated rows into a single `*`. That run is me, the preamble. Then the right-hand column spells `DICM`, four letters that mark a DICOM file. 128 Empty Bytes is about both.

## Build it

> **The Preamble:** Now the File inspector, under the console: go-dicom's elements in a tree on the left, the same file in hex on the right. Select the row `0010,0010`, Patient's Name, in the tree.

---

> **The Preamble:** Its bytes light up in the hex: the whole element, twenty bytes, with `FALLS^DICOM` readable on the right after a few bytes that are not text. Stage 2 says what those are. The link works both ways: mark bytes in the hex, and the tree selects the element they belong to. Two views of one file.

> **The Preamble:** Now mark the Modality element, `0008,0060`.

---

> **The Preamble:** Ten bytes this time, starting at offset 628, and the last two are `43 54`. Every element has an offset like that; you never have to count from 0 by hand, but now you could.

## Watch it

> **The Preamble:** On the right, `43 54` reads `CT`. How does a file store a letter?
>
> - as a tiny picture of the letter
> - [x] as one byte, by a code every computer shares
> - as two bytes, one for each half

---

> **The Preamble:** One byte per letter, by the code called ASCII: `41` is A, `43` is C, `54` is T. DICOM's default set of characters, PS3.5 §6.1, is this basic set, so any DICOM reader anywhere reads `43 54` as `CT`. That is why every text value shows through in the right-hand column, and why a number stored as plain bytes shows only dots or stray letters.

## Debrief

> **The Preamble:** Every value is bytes at an offset, and now you can find them yourself. Text shows through; plain numbers do not, and stage 2 learns to read those too. 128 Empty Bytes starts where every DICOM file starts: offset 0, with me.

## Real world

On your own machine, with any DICOM file:

```
hexdump -C ct.dcm | head
go-dicom show ct.dcm
```

On a computer without `hexdump`, `xxd ct.dcm | head` prints the same bytes in a slightly different layout.
