# The Same Object Twice

**Question:** What changes, and what stays, when one object is written in another transfer syntax?

## Scene

> **VR:** Two files in `/lab/`, and one object. In No Letters you read Patient's Name in both: the same name, in other bytes. Tonight only one copy goes to the archive, and nobody sends a file they cannot vouch for. So prove which parts of the two are the same, and which are not, from the sizes down to single bytes. Then either copy can go, and you will know what the archive receives.

## See it

> **VR:** Start with their sizes: `ls -l /lab`.

---

```recorded ls -l /lab
(recorded on the Machine)
```

> **VR:** 9,648 bytes for the explicit file, 9,638 for the implicit one: ten bytes apart. The size column counts every byte, from the preamble to the last pixel. Ten bytes is little, for a file that dropped my letters from almost every element. Hold on to that. Now print the explicit file's elements: `go-dicom show /lab/ct-explicit-le.dcm`.

---

```recorded go-dicom show /lab/ct-explicit-le.dcm
(recorded on the Machine)
```

> **VR:** Then the implicit file's: `go-dicom show /lab/ct-implicit-le.dcm`.

---

```recorded go-dicom show /lab/ct-implicit-le.dcm
(recorded on the Machine)
```

> **VR:** Line by line: the same tags, the same values, and the same VR column, though one file wrote my letters and the other left them to the dictionary. Only two lines of group 0002 differ, the group length and the Transfer Syntax UID itself: the one element that says which rules the rest was written by. Even the instance's own name, SOP Instance UID, `0008,0018`, is the same in both. Stage 3 follows that name.

## Build it

> **VR:** In the implicit file's hex, find the Transfer Syntax UID, `02 00 10 00`, at offset 244. Mark the two bytes after its tag.

---

> **VR:** `55 49`: `UI`. The implicit file wrote my letters after all. PS3.10 §7.1: _the File Meta Information is always explicit_, Explicit VR Little Endian in every Part 10 file, whatever its Transfer Syntax UID says. The UID rules only the Data Set, so a reader can read it before it knows the rules.

> **VR:** Now Pixel Data. In the explicit file it starts at 1444. Two things move it in the implicit file: its Transfer Syntax UID is 2 bytes shorter, and each long-form element of the Data Set before Pixel Data takes 4 bytes fewer, with no letters and no reserved bytes. Give its offset in the implicit file.

---

> **VR:** 1444, minus 2, minus 4 for the one `SQ` element: 1438.

## Watch it

> **VR:** Where do the ten bytes between the two files go?
>
> - every element lost two letters
> - [x] 2 in the Transfer Syntax UID, then 4 for each long-form element
> - the implicit file packs its pixels tighter

---

> **VR:** Two in group 0002: `1.2.840.10008.1.2` takes 18 bytes with its padding, against 20. Eight in the Data Set: the sequence and Pixel Data each take 12 bytes before their value in explicit VR, and 8 in implicit. A short-form element takes 8 in both, so nearly every element kept its size. Ask `cmp` where the files first differ: `cmp /lab/ct-explicit-le.dcm /lab/ct-implicit-le.dcm`.

---

```recorded cmp /lab/ct-explicit-le.dcm /lab/ct-implicit-le.dcm
(recorded on the Machine)
```

> **VR:** `cmp` counts bytes from 1, so its number is the offset plus one: offset 140, inside the group length's value, 184 against 182.

## Debrief

> **VR:** A transfer syntax changes the bytes, the offsets and the size, never the values, and never group 0002's rules. Either file can go to the archive: they hold one object. Elements Inside Elements opens the one element whose value is other elements.

## Real world

Compare two encodings of one object on your own machine:

```
ls -l a.dcm b.dcm
go-dicom show a.dcm
go-dicom show b.dcm
cmp a.dcm b.dcm
```

`cmp` prints nothing when two files are byte for byte the same. Two files can differ in every byte after offset 140 and still hold the same object.
