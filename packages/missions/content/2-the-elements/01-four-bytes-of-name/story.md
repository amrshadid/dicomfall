# Four Bytes of Name

**Question:** How does an element say which element it is?

## Scene

> **VR:** I am VR, the Value Representation, and this stage is mine. In stage 1 you mapped the four regions of a file and walked its File Meta Information. Now we open one element of the Data Set, and I will be exact about every byte of it. An element begins by saying which element it is. That takes four bytes, every time, and a reader that cannot read them cannot read anything after them.

## See it

> **VR:** In the File inspector, open `/lab/ct-explicit-le.dcm` and select Modality in the tree, the row `0008,0060`.

---

> **VR:** The first four bytes it lights up in the hex are `08 00 60 00`. That is the element's _tag_: its number. A tag has two halves of two bytes each, the _group_, `0008`, then the _element number_, `0060`. Each half is stored little endian, as the group length was in stage 1: low byte first. So `0008` is stored `08 00`, and `0060` is stored `60 00`.

> **VR:** A tag is only a number. The name Modality comes from the _data dictionary_: PS3.6, the standard's list of every tag with its name and keyword. go-dicom carries a copy. Look a tag up: type `go-dicom tag-doc 0010,0020`.

---

```recorded go-dicom tag-doc 0010,0020
DICOM Tag Documentation
==================================================

Tag:      (0010,0020) (00100020)
Name:     Patient ID
Keyword:  PatientID
VR:       LO
VM:       1
Status:   ACTIVE
Type:     STANDARD

Description:
--------------------------------------------------
VR: LO - Long String
VM: 1 - Value Multiplicity
```

> **VR:** `0010,0020` is Patient ID. Its keyword, `PatientID`, is the same name written for programs to use. The line marked VR is about me, and we read it in the next mission; VM waits a little longer.

## Build it

> **VR:** Mark Modality's tag in the hex: its four bytes, and nothing after them. Drag over them, or the objective will not tick: a tag is never the whole element.

---

> **VR:** Now Patient ID, without the tree's help. First write its tag as the file stores it: group first, then element number, each half low byte first. Then find those four bytes in the hex, a little after the letters of Patient's Name, and give the offset of the first one. Count from the start of the row, as you did in stage 1.

---

> **VR:** `10 00 20 00`, at offset 898. You read the tag the way every reader does: four bytes, two little-endian halves, then a lookup in the dictionary. A tag written backwards, `00 10 00 20`, is not in this file at all.

## Watch it

> **VR:** Which comes first in the file: Patient's Name, `0010,0010`, or Modality, `0008,0060`?
>
> - Patient's Name
> - [x] Modality
> - either one: the writer chooses

---

> **VR:** Modality, at offset 628, well before Patient's Name at 878. The elements of a Data Set sit in increasing _tag order_, PS3.5 §7.1: by group, then by element number. A reader that has passed `0010,0010` knows `0008,0060` is behind it, and go-dicom prints the elements in that same order.

> **VR:** One more thing the dictionary does not hold. A tag whose group number is odd, such as `0009`, names a _private element_: a vendor defines it, not the standard. This file has none.

## Debrief

> **VR:** A tag is a number, group then element, each half stored low byte first. The dictionary gives it a name, and tags rise through the file. After the tag come my two letters. Two Letters and a Length reads them.

## Real world

Look tags up by number or by keyword, and print one element of your own file:

```
go-dicom tag-doc 0010,0020
go-dicom tag-doc -keyword Modality
go-dicom show ct.dcm::0008,0060
```

`tag-doc` needs no file: it reads go-dicom's own copy of the dictionary.
