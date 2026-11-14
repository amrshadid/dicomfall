package main

import (
	"bytes"
	"crypto/sha256"
	"encoding/binary"
	"encoding/hex"
	"fmt"

	"github.com/amrshadid/go-dicom/dataelem"
	"github.com/amrshadid/go-dicom/dataset"
	"github.com/amrshadid/go-dicom/filebase"
	"github.com/amrshadid/go-dicom/filereader"
	"github.com/amrshadid/go-dicom/sequence"
	"github.com/amrshadid/go-dicom/tag"
)

// FileDump is go-dicom's reading of one file, in the shape the pydicom side
// of scripts/crosscheck.py produces, so the two can be compared key by key.
type FileDump struct {
	TransferSyntaxUID string                              `json:"transferSyntaxUid"`
	ExplicitVR        bool                                `json:"explicitVr"`
	LittleEndian      bool                                `json:"littleEndian"`
	HasPreamble       bool                                `json:"hasPreamble"`
	Meta              map[string]dataset.DICOMJSONElement `json:"meta"`
	Dataset           map[string]dataset.DICOMJSONElement `json:"dataset"`
	Pixels            *PixelDump                          `json:"pixels,omitempty"`
}

// PixelDump fingerprints the decoded pixel array: its shape as go-dicom
// reports it, [frames, rows, columns], and the SHA-256 of the samples as
// little-endian uint16 in row-major order.
type PixelDump struct {
	Shape  []int  `json:"shape"`
	SHA256 string `json:"sha256"`
}

func dumpFile(data []byte) (*FileDump, error) {
	f, err := filereader.ReadDICOMFile(filebase.NewFileReader(bytes.NewReader(data)))
	if err != nil {
		return nil, err
	}
	if f.FileMetaInfo == nil {
		return nil, fmt.Errorf("no file meta information")
	}

	// Built from the elements as read rather than with GetDataset, which
	// re-labels Specific Character Set as ISO_IR 192 after decoding text. The
	// cross-check is about what is in the file.
	meta := rawDataset(f.MetaElements)
	// go-dicom reads (0002,0000) into FileMetaInfo rather than keeping it
	// with the other meta elements; put it back so it is compared too.
	groupLength, err := dataelem.ValueBytes(dataelem.UL, f.FileMetaInfo.FileMetaInformationGroupLength)
	if err != nil {
		return nil, err
	}
	if err := meta.Add(dataelem.NewDataElement(fileMetaGroupLengthTag, dataelem.UL, groupLength)); err != nil {
		return nil, err
	}
	ds := rawDataset(f.DataElements)
	ds.SetTransferSyntaxUID(f.FileMetaInfo.TransferSyntaxUID)

	d := &FileDump{
		TransferSyntaxUID: f.FileMetaInfo.TransferSyntaxUID,
		ExplicitVR:        f.ExplicitVR,
		LittleEndian:      f.IsLittleEndian,
		HasPreamble:       f.HasPreamble,
	}
	if d.Meta, err = meta.ToDICOMJSON(); err != nil {
		return nil, fmt.Errorf("meta: %w", err)
	}
	if d.Dataset, err = ds.ToDICOMJSON(); err != nil {
		return nil, fmt.Errorf("data set: %w", err)
	}
	if ds.Contains(keywordTag("PixelData")) {
		if d.Pixels, err = dumpPixels(ds); err != nil {
			return nil, fmt.Errorf("pixels: %w", err)
		}
	}
	return d, nil
}

var fileMetaGroupLengthTag = tag.New(0x0002, 0x0000)

func rawDataset(elements []*filereader.DataElementValue) *dataset.Dataset {
	ds := dataset.NewDataset()
	for _, e := range elements {
		if e.Items != nil || e.VR == string(dataelem.SQ) {
			seq := sequence.New()
			for _, item := range e.Items {
				_ = seq.Append(rawDataset(item.Elements))
			}
			_ = ds.AddSequence(e.Tag, seq)
			continue
		}
		_ = ds.Add(dataelem.NewDataElement(e.Tag, dataelem.VR(e.VR), e.Value))
	}
	return ds
}

func dumpPixels(ds *dataset.Dataset) (*PixelDump, error) {
	shape, err := ds.PixelDataShape()
	if err != nil {
		return nil, err
	}
	arr, err := ds.PixelArray()
	if err != nil {
		return nil, err
	}
	frames, ok := arr.([][][]uint16)
	if !ok {
		return nil, fmt.Errorf("expected 16-bit samples, got %T", arr)
	}
	h := sha256.New()
	var sample [2]byte
	for _, frame := range frames {
		for _, row := range frame {
			for _, v := range row {
				binary.LittleEndian.PutUint16(sample[:], v)
				h.Write(sample[:])
			}
		}
	}
	return &PixelDump{Shape: shape, SHA256: hex.EncodeToString(h.Sum(nil))}, nil
}
