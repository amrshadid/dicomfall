package main

import (
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"path/filepath"

	"github.com/amrshadid/go-dicom/dataset"
	"github.com/amrshadid/go-dicom/filebase"
	"github.com/amrshadid/go-dicom/filewriter"
)

// memoryFile is the io.WriteSeeker filebase.NewFileWriter needs, kept in
// memory so a file can be hashed and compared before anything touches disk.
// go-dicom's writer only appends, so Seek just reports the end.
type memoryFile struct{ data []byte }

func (m *memoryFile) Write(p []byte) (int, error) {
	m.data = append(m.data, p...)
	return len(p), nil
}

func (m *memoryFile) Seek(offset int64, whence int) (int64, error) {
	if offset != 0 || whence != io.SeekEnd && whence != io.SeekCurrent {
		return 0, fmt.Errorf("memoryFile supports appending only")
	}
	return int64(len(m.data)), nil
}

// encode writes a Part 10 file: preamble, DICM, the file meta group (always
// Explicit VR Little Endian) and the data set in transferSyntax.
func encode(ds *dataset.Dataset, sopInstanceUID, transferSyntax string) ([]byte, error) {
	out := &memoryFile{}
	w := filewriter.NewDICOMFileWriter(filebase.NewFileWriter(out))
	w.SetFileMetaInfo(&filewriter.FileMetaInfo{
		MediaStorageSOPClassUID:    ctImageStorage,
		MediaStorageSOPInstanceUID: sopInstanceUID,
		TransferSyntaxUID:          transferSyntax,
	})
	if err := w.AddDataElements(filewriter.ElementsFromDataset(ds)); err != nil {
		return nil, err
	}
	if err := w.Write(); err != nil {
		return nil, err
	}
	if err := w.Close(); err != nil {
		return nil, err
	}
	return out.data, nil
}

// ManifestEntry is what the game needs to know about a file without parsing
// it, and what the tests hold every regenerated file to.
type ManifestEntry struct {
	Path              string `json:"path"`
	SOPClassUID       string `json:"sopClassUid"`
	SOPInstanceUID    string `json:"sopInstanceUid"`
	StudyInstanceUID  string `json:"studyInstanceUid"`
	SeriesInstanceUID string `json:"seriesInstanceUid"`
	TransferSyntaxUID string `json:"transferSyntaxUid"`
	Size              int    `json:"size"`
	SHA256            string `json:"sha256"`
}

type Manifest struct {
	UIDScheme string          `json:"uidScheme"`
	Files     []ManifestEntry `json:"files"`
}

const uidScheme = "2.25 UUID-derived UIDs (PS3.5 B.2) from RFC 9562 version 5 UUIDs " +
	"in the URL namespace, named " + uidNamePrefix + "<key>"

type generatedFile struct {
	entry ManifestEntry
	data  []byte
}

func generate() ([]generatedFile, error) {
	type job struct {
		path           string
		slice          slice
		transferSyntax string
	}
	jobs := []job{
		{"ct-explicit-le.dcm", theInstance, explicitVRLittleEndian},
		{"ct-implicit-le.dcm", theInstance, implicitVRLittleEndian},
	}
	for _, f := range sortingSet {
		jobs = append(jobs, job{f.name, f.slice, explicitVRLittleEndian})
	}

	files := make([]generatedFile, 0, len(jobs))
	for _, j := range jobs {
		ds, err := j.slice.build()
		if err != nil {
			return nil, fmt.Errorf("%s: %w", j.path, err)
		}
		data, err := encode(ds, j.slice.sopInstanceUID(), j.transferSyntax)
		if err != nil {
			return nil, fmt.Errorf("%s: %w", j.path, err)
		}
		sum := sha256.Sum256(data)
		files = append(files, generatedFile{
			entry: ManifestEntry{
				Path:              j.path,
				SOPClassUID:       ctImageStorage,
				SOPInstanceUID:    j.slice.sopInstanceUID(),
				StudyInstanceUID:  j.slice.series.study.uid(),
				SeriesInstanceUID: j.slice.series.uid(),
				TransferSyntaxUID: j.transferSyntax,
				Size:              len(data),
				SHA256:            hex.EncodeToString(sum[:]),
			},
			data: data,
		})
	}
	return files, nil
}

func manifestOf(files []generatedFile) Manifest {
	m := Manifest{UIDScheme: uidScheme}
	for _, f := range files {
		m.Files = append(m.Files, f.entry)
	}
	return m
}

func marshalManifest(m Manifest) ([]byte, error) {
	var b bytes.Buffer
	enc := json.NewEncoder(&b)
	enc.SetIndent("", "  ")
	// The file is read by people as well as code; "<key>" reads better
	// than "<key>".
	enc.SetEscapeHTML(false)
	if err := enc.Encode(m); err != nil {
		return nil, err
	}
	return b.Bytes(), nil
}

func writeAll(outDir string) error {
	files, err := generate()
	if err != nil {
		return err
	}
	for _, f := range files {
		path := filepath.Join(outDir, filepath.FromSlash(f.entry.Path))
		if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
			return err
		}
		if err := os.WriteFile(path, f.data, 0o644); err != nil {
			return err
		}
	}
	manifest, err := marshalManifest(manifestOf(files))
	if err != nil {
		return err
	}
	return os.WriteFile(filepath.Join(outDir, "manifest.json"), manifest, 0o644)
}
