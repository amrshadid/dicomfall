import { SectionHead } from '@shared/components/ui'

export interface AboutLinks {
  readonly repository: string
  readonly contributing: string
  readonly issues: string
}

export interface AboutSectionProps {
  version: string
  /** Where saves go, e.g. "Saved in this browser", or why they don't. */
  storage: string
  links: AboutLinks
}

export function AboutSection({ version, storage, links }: AboutSectionProps) {
  return (
    <section aria-labelledby="settings-about-h" className="settings__section" id="settings-about">
      <SectionHead id="settings-about-h">6 · About</SectionHead>
      <dl className="settings-about">
        <dt>Version</dt>
        <dd>{version}</dd>
        <dt>Your data</dt>
        <dd>{storage}. No accounts: your progress never leaves this browser (see Privacy).</dd>
        <dt>The Machine</dt>
        <dd>
          Real Linux on an emulated PC (v86), running in this browser. Each application entity is a network namespace
          running go-dicom's released tools; every value you read is go-dicom's own reading of the bytes.
        </dd>
        <dt>Source</dt>
        <dd>
          The whole game is open on{' '}
          <a href={links.repository} target="_blank" rel="noreferrer">
            GitHub
          </a>
          .
        </dd>
        <dt>Contribute</dt>
        <dd>
          Found something that doesn't match DICOM or go-dicom, or want to add a mission? Read{' '}
          <a href={links.contributing} target="_blank" rel="noreferrer">
            CONTRIBUTING.md
          </a>{' '}
          and open an{' '}
          <a href={links.issues} target="_blank" rel="noreferrer">
            issue
          </a>
          .
        </dd>
        <dt>Licence</dt>
        <dd>
          The game is MIT. go-dicom (MIT) and the Linux image keep their own licences; the game runs them unmodified.
        </dd>
      </dl>
    </section>
  )
}
