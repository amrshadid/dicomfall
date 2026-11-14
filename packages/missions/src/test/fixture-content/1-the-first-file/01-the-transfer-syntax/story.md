# The Transfer Syntax

**Question:** How does a reader know how the rest of the file is written?

## Scene

> **The Preamble:** My 128 bytes say nothing. Look past the prefix.

## Debrief

> **The Preamble:** One UID tells the reader how every element after the meta is written.

## Real world

Print a file's elements on your own machine:

```
go-dicom show ct.dcm
```
