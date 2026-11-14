# Read Any Element

**Question:** Given any offset in a file, can you read the element that starts there and say where the next one starts?

## Scene

> **VR:** Seven missions: a tag, my letters, a length, the long form, many values, no letters, and elements inside elements. Now all of it at once, at an offset you have never looked at, in the file that does not write me down. Bytes, an offset, and what you know. The tree can wait until you are done: tonight a reader with no tree has to be you, and the archive will trust what you read.

## See it

> **VR:** The file is `/lab/ct-implicit-le.dcm`. Its Transfer Syntax UID names Implicit VR Little Endian. Its File Meta Information still carries my letters, as every Part 10 file's does; from offset 326 on, its Data Set carries none. So every element you meet there is four bytes of tag, four of length, then the value, whatever its VR. A sequence is no different on the outside, and neither is an item: four and four. Only the dictionary knows which is which.

> **VR:** Look at the bytes around the place you will read: `hexdump -C -s 800 -n 48 /lab/ct-implicit-le.dcm`.

---

```recorded hexdump -C -s 800 -n 48 /lab/ct-implicit-le.dcm
(recorded on the Machine)
```

> **VR:** `-s 800` starts the dump at offset 800, and `-n 48` stops it 48 bytes later. Each row still starts with its offset in hex: `00000320` is 800, so the row's seventh byte is offset 806. The same bytes are in the File inspector's hex pane, where you can mark them. Hex `0x326` and decimal 806 name the same byte.

## Build it

> **VR:** An element starts at offset 806 of `/lab/ct-implicit-le.dcm`. Mark its tag, give its value, and predict where the next element starts.

---

> **VR:** Read it as a reader does. Four bytes of tag, low byte first in each half, then the dictionary for its name and its VR. Then four bytes of length, then that many bytes of value, padding and all. The length gives the value's end, and the value's end is the next tag. Give the value as the element means it, without its padding. If a step goes wrong, go back one: the tag first, always, because every byte after it depends on reading it right. `go-dicom tag-doc` is there for the lookup.

## Watch it

> **VR:** Your element sits inside an item of a sequence. Is the next one in that same item?
>
> - yes
> - [x] no: the item and its sequence both end there
> - it depends on the VR

---

> **VR:** The item starts at 760: 760 + 8 + 68 is 836. The sequence starts at 752: 752 + 8 + 76 is 836 too. So 836 holds Series Description, `0008,103E`, back in the Data Set, and you read the item's last element, Code Meaning: `LO`, 21 characters and a space. Its comma is no separator; its VM is 1. In the explicit file it starts at 812, 2 bytes of UID and 4 of long form later. Every length was defined; at `FFFFFFFF` you would seek a delimitation item.

## Debrief

> **VR:** Any element, in either of these encodings: tag, dictionary, length, value, and the next tag. That was my stage. Stage 3 stops counting bytes and asks what the elements mean: which study, which series, and SOP Instance UID, `0008,0018`, the name of this one instance.

## Real world

Read an element at an offset of your own file by hand, then check it:

```
hexdump -C -s 806 -n 32 ct-implicit.dcm
go-dicom tag-doc 0008,0104
go-dicom show ct-implicit.dcm
```

On your own files the offsets differ: pick any line of `go-dicom show`, find its tag in the hex, and walk to the next.
