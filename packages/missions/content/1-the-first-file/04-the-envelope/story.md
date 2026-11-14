# The Envelope

**Question:** What does the file say about itself before the object begins?

## Scene

> **The Preamble:** After `DICM`, the file describes itself before the object begins, the way the label on an envelope tells you what is inside and where it goes. Where that picture stops: this label is written for the reader's software, not for a person, and it tells the software exactly how far to read. Read the label, then find where the letter starts: the offset of the object's first byte.

## See it

> **The Preamble:** Type `go-dicom show /lab/ct-explicit-le.dcm | head`.

---

```recorded go-dicom show /lab/ct-explicit-le.dcm | head
=== DICOM File: /lab/ct-explicit-le.dcm ===
Tag          VR  Length  Value
─────────────────────────────────────────────
0002,0001    OB  2       <2 bytes>
0002,0002    UI  26      1.2.840.10008.5.1.4.1.1.2
0002,0003    UI  44      2.25.251886266211036739612775034372164643306
0002,0010    UI  20      1.2.840.10008.1.2.1
0002,0012    UI  26      1.2.826.0.1.3680043.10.511
0002,0013    SH  14      GO-DICOM-1.8.0
0008,0005    CS  10      ISO_IR 100
```

> **The Preamble:** Every tag there starts with `0002`. A tag is two numbers: the first four digits are its _group_, the last four number the element inside that group, so `0002,0010` is element `0010` of group `0002`. Stage 2 takes the tag apart. Group 0002 is the _File Meta Information_: the elements that describe the file itself, right after the prefix, PS3.10 §7.1. In the File inspector, it is the band after the prefix. Every Part 10 file has it, and it comes before anything about the patient.

> **The Preamble:** They say what kind of object the file holds and which one it is, in the Media Storage SOP Class and Instance UIDs, read in stage 3. They also say how the rest of the file is written, its transfer syntax, which How to Read the Rest opens.

> **The Preamble:** After group 0002, in the full list, come other groups: the _Data Set_, the object itself. Everything `info` showed you lives there, the patient's name and the picture among it.

## Build it

> **The Preamble:** Where does the File Meta Information end? Its first element says. Type `go-dicom show /lab/ct-explicit-le.dcm::0002,0000`.

---

```recorded go-dicom show /lab/ct-explicit-le.dcm::0002,0000
Error: show: element '0002,0000' not found
```

> **The Preamble:** That is the _group length_: how many bytes of group 0002 come after this element. Here, 184. It counts bytes, not elements. The element starts at offset 132, right after the prefix, and takes 12 bytes: 4 for the tag, 2 for the VR letters `UL`, 2 for the length, 4 for the value.

> **The Preamble:** So it ends at 144, and 184 bytes later the group ends. Predict the offset of the Data Set's first element, and give it beside the objective.

---

> **The Preamble:** 144 plus 184: 328. Now mark the File Meta Information, from offset 132 up to 327.

---

> **The Preamble:** Then mark the Data Set, from 328 to the last byte of the file.

---

## Watch it

> **The Preamble:** The Data Set's first element: which group is it in?
>
> - 0002, like the elements before it
> - [x] another group: 0002 never appears in a Data Set
> - any group, picked at random

---

> **The Preamble:** Group `0008`: the element `0008,0005`, Specific Character Set, which names the set of characters the text values use. Group 0002 belongs to the File Meta Information alone, PS3.10 §7.1, so the first tag of another group is where the object begins. A reader needs no guesswork: it reads the group length, adds 144, and lands on the object's first byte. Scroll down the Data Set: most of its bytes are one element, Pixel Data, the picture.

## Debrief

> **The Preamble:** The File Meta Information is about the file; the Data Set is the object, and the group length says where one ends. One element of the File Meta Information says how the object is written. How to Read the Rest finds it.

## Real world

On your own machine:

```
go-dicom show ct.dcm | head
go-dicom show ct.dcm::0002,0000
```

Add 144 to the second command's value: that is where the file's Data Set starts, in any Part 10 file.
