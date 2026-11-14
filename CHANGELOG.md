# Changelog

Every change players or contributors notice. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Security

- **The site sends security headers.** A Content-Security-Policy lets the page run only the
  site's own code, the Linux machine's WebAssembly and, once allowed, Clarity. No other site
  can frame the game, and the page asks for no camera, microphone or other device. The
  machine itself has no way to the internet, and what is typed in it changes only the
  player's own copy.

### Added

- The repository: workspace, lint, type and test setup, CI, issue templates, and the shared
  `core` and `theme` packages.
- The game engine's first part: progress, saves, hints, Codex, skills, and the mission
  format with its file and wire checks.
- The content loader and report, with the seven stages of the journey.
- Synthetic fixtures: one CT instance in Explicit and Implicit VR Little Endian, and a series
  to sort by UID, checked against pydicom.
- The app shell: title screen, settings, tour, the bigger-screen page, shortcuts, notices,
  the analytics consent, the 404 page and the loading sheet.
- The mission format, the game's vocabulary, and the mission specs for stages 1 to 3 and the
  bridge.
