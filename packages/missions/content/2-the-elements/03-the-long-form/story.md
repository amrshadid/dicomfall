# The Long Form

**Question:** Why do some elements have four more bytes before their value?

## Scene

> **VR:** In Two Letters and a Length, two bytes of length counted every value. Two bytes count to 65,535. One CT picture can need far more than that, and some values are not text at all. For those of my kind the layout changes, and the change starts right where you would expect the length. Read it wrong, and every offset after it is wrong too.

## See it

> **VR:** In stage 1 you met File Meta Information Version, `0002,0001`, at offset 144. Select it in the tree of `/lab/ct-explicit-le.dcm`.

---

> **VR:** Fourteen bytes: `02 00 01 00 4f 42 00 00 02 00 00 00 00 01`. The tag, then `OB`. Then not a length but two bytes of `00`, reserved by PS3.5 §7.1.2 and always zero. Then a length of four bytes, `02 00 00 00`: 2. Then the value, `00 01`.

> **VR:** This is the _long form_: tag 4, VR 2, reserved 2, length 4. Twelve bytes before the value, where `CS` and `PN` took eight. The VR decides the form. `OB` takes it, and so do `OW`, `SQ`, `UN` and `UT`, among others. `OB` is a value of raw bytes; `OW` a value of 16-bit words, each stored in two bytes, little endian here. Neither is text, so neither is padded with a space. `SQ`, a sequence, is an element that holds other elements: this stage opens one in its last region.

## Build it

> **VR:** The element after it is Media Storage SOP Class UID, `0002,0002`. Count the long form's twelve bytes and the value's two, and give the offset where it starts.

---

> **VR:** 144, plus 12, plus 2: offset 158. Every Part 10 file starts its group 0002 with these same two elements, in tag order, so in every one of them this element starts at 158. A reader that took `OB` for a short-form VR would read the reserved `00 00` as a length of 0 and look for a tag at 152, inside the real length. Now the last element of this file, Pixel Data, `7FE0,0010`: the picture itself. Ask for it alone: `go-dicom show /lab/ct-explicit-le.dcm::7FE0,0010`.

---

```recorded go-dicom show /lab/ct-explicit-le.dcm::7FE0,0010
7FE0,0010    OW  8192    <100 bytes>... (8192 bytes)
```

> **VR:** Its VR is `OW`: the pixels, as 16-bit words. In the hex, after `e0 7f 10 00` come `4f 57`, then `00 00`, then four bytes of length. Mark those four.

---

## Watch it

> **VR:** The picture is 64 rows by 64 columns, two bytes per pixel. Before you read the length: how many bytes is it?
>
> - 4,096
> - [x] 8,192
> - 64

---

> **VR:** The four bytes are `00 20 00 00`. Little endian, they read `0x2000`: 8,192, which is 64 × 64 × 2, at two bytes per pixel. Two bytes of length could have held that, but not a bigger picture: one slice of 512 by 512 pixels takes 524,288 bytes. Four bytes of length count to about 4 GB. `OB` and `OW` use the long form whatever their own value's size: File Meta Information Version holds two bytes, and still takes twelve before them. Stage 3 reads what those pixels mean.

## Debrief

> **VR:** Short form, eight bytes before the value; long form, twelve; and the VR decides which, so a reader reads my letters before it reads any length. One Name, Many Values looks at what a single value can hold.

## Real world

Read a long-form element of your own file, then its first sixteen bytes:

```
go-dicom show ct.dcm::7FE0,0010
go-dicom show ct.dcm::0002,0001
hexdump -C -s 144 -n 16 ct.dcm
```

`-s` skips to an offset, and `-n` stops after that many bytes. Offset 144 holds `0002,0001` only in a file whose group length element comes first, as every Part 10 file's does.
