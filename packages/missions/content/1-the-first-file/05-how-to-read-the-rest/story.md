# How to Read the Rest

**Question:** What does the Transfer Syntax UID tell the reader?

## Scene

> **The Preamble:** The envelope says how the letter inside is written. Without that, a reader would have to guess: does each element say what kind of value it holds? Which way round are the numbers stored? Is the picture squeezed smaller? One element of the File Meta Information answers all three. Find it, and you can read any file the way its writer meant.

## See it

> **The Preamble:** First, the number you used in The Envelope. In the File inspector, select the group length element, `0002,0000`, and look at its last four bytes, offsets 140 to 143.

---

> **The Preamble:** `b8 00 00 00`. In hex, `b8` is eleven sixteens and eight: 184, the group length. A number too big for one byte takes several, and here the least significant byte comes first. That is _little endian_, PS3.5 §7.3: read the bytes from last to first, `00 00 00 b8`, and you read the number. In The Envelope, `show` turned them round for you.

> **The Preamble:** Now the element you came for. Type `go-dicom show /lab/ct-explicit-le.dcm::0002,0010`.

---

```recorded go-dicom show /lab/ct-explicit-le.dcm::0002,0010
0002,0010    UI  20      1.2.840.10008.1.2.1
```

> **The Preamble:** `0002,0010` is Transfer Syntax UID. A _UID_ is a unique identifier: numbers joined by dots, at most 64 characters, PS3.5 §9. Each names one thing, once, for the whole world. UIDs that start `1.2.840.10008` are DICOM's own. A UID is only a name: to learn the rules it stands for, a reader looks it up in PS3.6, which lists every UID DICOM defines. The two UIDs above it, Media Storage SOP Class and Instance UIDs, wait for stage 3.

## Build it

> **The Preamble:** Mark the Transfer Syntax UID element: its row in the File inspector's tree.

---

> **The Preamble:** Twenty-eight bytes light up, from offset 244, and the value shows in the right-hand column: digits and dots, one byte each. Now give the value beside the objective.

---

> **The Preamble:** `1.2.840.10008.1.2.1` names Explicit VR Little Endian, PS3.5 Annex A.2. It is this file's _transfer syntax_: the rules its Data Set is written by. Explicit VR: each element writes its VR, the two letters of `show`'s second column, in its bytes; implicit VR would leave them out. Little endian, like the 184 you read. And the pixels are not compressed: Pixel Data holds them as they are. Change any one of those rules and the UID changes with it.

## Watch it

> **The Preamble:** `1.2.840.10008.1.2.1` has 19 characters. How many bytes does its value take in the file?
>
> - 19
> - [x] 20
> - 64

---

> **The Preamble:** Twenty. Look at the marked bytes in the hex: after the last `1` comes one more byte, `00`, at offset 271. A DICOM value always takes an even number of bytes, so a UID of odd length gets one `00` added. That `00` is not part of the UID, and a reader drops it. A length in DICOM counts bytes, padding included, not characters. And 64 is the most a UID may take, PS3.5 §9, never what every UID takes. Stage 2 says why lengths are even.

## Debrief

> **The Preamble:** The Transfer Syntax UID tells a reader how to read the Data Set. One more file came with tonight's, written in the default transfer syntax, which every DICOM implementation must read. A Second File maps it, with everything this stage has taught you.

## Real world

On your own machine:

```
go-dicom show ct.dcm::0002,0010
go-dicom tag-doc 0002,0010
```

The first prints a file's Transfer Syntax UID; the second, what go-dicom's dictionary says about that element. PS3.6 lists every UID DICOM defines, with its name.
