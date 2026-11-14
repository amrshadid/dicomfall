// Command fixtures generates DICOMFall's synthetic DICOM files with go-dicom,
// and with -dump prints go-dicom's reading of files for the pydicom
// cross-check.
//
//	go run . -out out
//	go run . -dump out/ct-explicit-le.dcm out/series/f01.dcm
package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"os"
)

func main() {
	outDir := flag.String("out", "", "directory to write the fixtures and manifest.json into")
	dump := flag.Bool("dump", false, "print go-dicom's reading of the files given as arguments, as JSON")
	flag.Parse()

	var err error
	switch {
	case *dump:
		err = runDump(flag.Args())
	case *outDir != "":
		err = writeAll(*outDir)
	default:
		flag.Usage()
		os.Exit(2)
	}
	if err != nil {
		fmt.Fprintln(os.Stderr, "fixtures:", err)
		os.Exit(1)
	}
}

func runDump(paths []string) error {
	if len(paths) == 0 {
		return fmt.Errorf("-dump needs at least one file")
	}
	out := make(map[string]*FileDump, len(paths))
	for _, p := range paths {
		data, err := os.ReadFile(p)
		if err != nil {
			return err
		}
		d, err := dumpFile(data)
		if err != nil {
			return fmt.Errorf("%s: %w", p, err)
		}
		out[p] = d
	}
	enc := json.NewEncoder(os.Stdout)
	enc.SetIndent("", "  ")
	return enc.Encode(out)
}
