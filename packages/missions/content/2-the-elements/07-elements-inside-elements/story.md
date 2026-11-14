# Elements Inside Elements

**Question:** How does one element hold whole sets of other elements?

## Scene

> **VR:** Most of my kind say how a value is written. One does not. `SQ`, which you met in The Long Form and counted in The Same Object Twice, holds no value of its own: it holds elements. Whole sets of them, each element with its own tag, VR and length, all inside one element of the Data Set. A reader that cannot open it skips the whole thing by its length. Today you open it.

## See it

> **VR:** Print every element of the explicit file: `go-dicom show /lab/ct-explicit-le.dcm`.

---

```recorded go-dicom show /lab/ct-explicit-le.dcm
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
0008,0008    CS  22      ORIGINAL\PRIMARY\AXIAL
0008,0012    DA  8       20260105
0008,0013    TM  6       093512
0008,0016    UI  26      1.2.840.10008.5.1.4.1.1.2
0008,0018    UI  44      2.25.251886266211036739612775034372164643306
0008,0020    DA  8       20260105
0008,0021    DA  8       20260105
0008,0022    DA  8       20260105
0008,0023    DA  8       20260105
0008,0030    TM  6       093000
0008,0031    TM  6       093512
0008,0032    TM  6       093512
0008,0033    TM  6       093512
0008,0050    SH  8       DFA0001
0008,0060    CS  2       CT
0008,0070    LO  28      DICOMFall Synthetic Imaging
0008,0080    LO  22      DICOMFall Teaching Lab
0008,0090    PN  0
0008,1010    SH  8       DF-CT-01
0008,1030    LO  18      Synthetic phantom
0008,1032    SQ  0
0008,0100    SH  14        DF-CT-PHANTOM
0008,0102    SH  8         99DFALL
0008,0104    LO  22        CT phantom, synthetic
0008,103E    LO  14      Axial phantom
0008,1090    LO  6       Fall-1
0010,0010    PN  12      FALLS^DICOM
0010,0020    LO  8       DF-0001
0010,0030    DA  8       19700101
0010,0040    CS  2       O
0018,0050    DS  2       5
0018,0060    DS  4       120
0018,1000    LO  10      DF-0000001
0018,1100    DS  4       320
0018,1151    IS  4       200
0018,1210    SH  8       STANDARD
0018,5100    CS  4       HFS
0020,000D    UI  44      2.25.244689099060892268776675746833514200113
0020,000E    UI  44      2.25.262811267488977860285166554097588707013
0020,0010    SH  2       1
0020,0011    IS  2       1
0020,0012    IS  2       1
0020,0013    IS  2       1
0020,0032    DS  12      -160\-160\0
0020,0037    DS  12      1\0\0\0\1\0
0020,0052    UI  44      2.25.96400224657394843332902432048480078343
0020,1040    LO  0
0020,1041    DS  2       0
0028,0002    US  2       1
0028,0004    CS  12      MONOCHROME2
0028,0010    US  2       64
0028,0011    US  2       64
0028,0030    DS  4       5\5
0028,0100    US  2       16
0028,0101    US  2       12
0028,0102    US  2       11
0028,0103    US  2       0
0028,1050    DS  2       40
0028,1051    DS  4       400
0028,1052    DS  6       -1024
0028,1053    DS  2       1
0028,1054    LO  2       HU
7FE0,0010    OW  8192    <100 bytes>... (8192 bytes)
```

> **VR:** Under Procedure Code Sequence, `0008,1032`, whose VR is `SQ`, a few values are pushed right: those elements sit inside it. The `SQ` line's Length reads 0, while the hex says 76: go-dicom keeps no value for a sequence, only its items. Now ask for the file without them: `go-dicom show --top /lab/ct-explicit-le.dcm`.

---

```recorded go-dicom show --top /lab/ct-explicit-le.dcm
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
0008,0008    CS  22      ORIGINAL\PRIMARY\AXIAL
0008,0012    DA  8       20260105
0008,0013    TM  6       093512
0008,0016    UI  26      1.2.840.10008.5.1.4.1.1.2
0008,0018    UI  44      2.25.251886266211036739612775034372164643306
0008,0020    DA  8       20260105
0008,0021    DA  8       20260105
0008,0022    DA  8       20260105
0008,0023    DA  8       20260105
0008,0030    TM  6       093000
0008,0031    TM  6       093512
0008,0032    TM  6       093512
0008,0033    TM  6       093512
0008,0050    SH  8       DFA0001
0008,0060    CS  2       CT
0008,0070    LO  28      DICOMFall Synthetic Imaging
0008,0080    LO  22      DICOMFall Teaching Lab
0008,0090    PN  0
0008,1010    SH  8       DF-CT-01
0008,1030    LO  18      Synthetic phantom
0008,1032    SQ  0
0008,103E    LO  14      Axial phantom
0008,1090    LO  6       Fall-1
0010,0010    PN  12      FALLS^DICOM
0010,0020    LO  8       DF-0001
0010,0030    DA  8       19700101
0010,0040    CS  2       O
0018,0050    DS  2       5
0018,0060    DS  4       120
0018,1000    LO  10      DF-0000001
0018,1100    DS  4       320
0018,1151    IS  4       200
0018,1210    SH  8       STANDARD
0018,5100    CS  4       HFS
0020,000D    UI  44      2.25.244689099060892268776675746833514200113
0020,000E    UI  44      2.25.262811267488977860285166554097588707013
0020,0010    SH  2       1
0020,0011    IS  2       1
0020,0012    IS  2       1
0020,0013    IS  2       1
0020,0032    DS  12      -160\-160\0
0020,0037    DS  12      1\0\0\0\1\0
0020,0052    UI  44      2.25.96400224657394843332902432048480078343
0020,1040    LO  0
0020,1041    DS  2       0
0028,0002    US  2       1
0028,0004    CS  12      MONOCHROME2
0028,0010    US  2       64
0028,0011    US  2       64
0028,0030    DS  4       5\5
0028,0100    US  2       16
0028,0101    US  2       12
0028,0102    US  2       11
0028,0103    US  2       0
0028,1050    DS  2       40
0028,1051    DS  4       400
0028,1052    DS  6       -1024
0028,1053    DS  2       1
0028,1054    LO  2       HU
7FE0,0010    OW  8192    <100 bytes>... (8192 bytes)
```

> **VR:** The pushed-right lines are gone and the `SQ` line stays: `--top` prints only the elements that sit in no sequence. The others belong to the sequence, and the tree in the File inspector folds them under it. Open the fold, and select the `SQ` row in the tree.

---

> **VR:** In the hex, at offset 754: the tag, then `53 51`, `SQ`, then `00 00` and a four-byte length, 76: the long form. Then `fe ff 00 e0`: the tag `FFFE,E000`, an _item_. An item is one set of elements inside a _sequence_. Its four-byte length, `44 00 00 00`, is 68, and it has no VR at all, PS3.5 §7.5.

## Build it

> **VR:** Mark the whole sequence element, from its tag to the last byte of its value.

---

> **VR:** Now mark its first item, from `fe ff 00 e0` to its last byte.

---

> **VR:** That is the item: its tag and length, eight bytes, then its value, which here runs to where the sequence ends. This sequence holds one item, and the item holds three elements: Code Value, Coding Scheme Designator and Code Meaning, which together name a procedure. Give the value of Code Value, `0008,0100`, inside the item.

---

> **VR:** Inside an item, every element reads as any other: tag, VR, length, value, in tag order. Only where it lives has changed. The item's length, 68, counts every byte of its three elements, and the sequence's length, 76, is the item's 8 bytes of tag and length, plus those 68.

## Watch it

> **VR:** Here every length is written down. A writer may also give a sequence or an item the length `ff ff ff ff`. How does a reader find its end then?
>
> - it reads about 4 GB
> - [x] it reads on until a delimitation item
> - it reads to the end of the file

---

> **VR:** `FFFFFFFF` is _undefined length_, PS3.5 §7.1.1. An item of undefined length ends with an Item Delimitation Item, tag `FFFE,E00D`; a sequence of undefined length ends with a Sequence Delimitation Item, `FFFE,E0DD`. Each is a tag and a length of zero. go-dicom writes every length defined, so neither file here holds one: you will meet them in files from other writers.

## Debrief

> **VR:** A sequence is an element of elements: items, each a small set of elements, nested as deep as needed. Tag, VR and length still rule inside, and the sequence's length steps over all of it. The capstone, Read Any Element, reads any element of a file by hand.

## Real world

Find the sequences in your own file: print it whole, then without the elements nested in them.

```
go-dicom show ct.dcm
go-dicom show --top ct.dcm
```

A line that is in the first listing and not the second sits inside a sequence.
