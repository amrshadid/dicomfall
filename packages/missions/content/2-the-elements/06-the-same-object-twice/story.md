# The Same Object Twice

**Question:** What changes, and what stays, when one object is written in another transfer syntax?

## Scene

> **VR:** Two files in `/lab/`, and one object. In No Letters you read Patient's Name in both: the same name, in other bytes. Tonight only one copy goes to the archive, and nobody sends a file they cannot vouch for. So prove which parts of the two are the same, and which are not, from the sizes down to single bytes. Then either copy can go, and you will know what the archive receives.

## See it

> **VR:** Start with their sizes: `ls -l /lab`.

---

```recorded ls -l /lab
total 20
-rw-r--r--    1 root     root          9648 Jan  1  1970 ct-explicit-le.dcm
-rw-r--r--    1 root     root          9638 Jan  1  1970 ct-implicit-le.dcm
drwxr-xr-x    3 root     root             0 Jan  1  1970 fixtures
```

> **VR:** 9,648 bytes for the explicit file, 9,638 for the implicit one: ten bytes apart. The size column counts every byte, from the preamble to the last pixel. Ten bytes is little, for a file that dropped my letters from almost every element. Hold on to that. Now print the explicit file's elements: `go-dicom show /lab/ct-explicit-le.dcm`.

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

> **VR:** Then the implicit file's: `go-dicom show /lab/ct-implicit-le.dcm`.

---

```recorded go-dicom show /lab/ct-implicit-le.dcm
=== DICOM File: /lab/ct-implicit-le.dcm ===
Tag          VR  Length  Value
─────────────────────────────────────────────
0002,0001    OB  2       <2 bytes>
0002,0002    UI  26      1.2.840.10008.5.1.4.1.1.2
0002,0003    UI  44      2.25.251886266211036739612775034372164643306
0002,0010    UI  18      1.2.840.10008.1.2
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
7FE0,0010    OB or OW 8192    ... (8192 bytes)
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
/lab/ct-explicit-le.dcm /lab/ct-implicit-le.dcm differ: char 141, line 1
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
