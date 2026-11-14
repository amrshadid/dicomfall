import type { LightboxImagePresentationProps } from '@features/lightbox/types'
import { LIGHTBOX_SECTIONS } from '@features/lightbox/utils/sections'
import { SectionHead } from '@shared/components/ui'
import './Lightbox.css'

const HEADING_ID = 'lightbox-preview-h'

/**
 * The image as go-dicom renders it, beside the elements that describe its pixels, as go-dicom read
 * them from the same file. Pixels are drawn square, without smoothing: a 64 × 64 image is 64 × 64.
 */
export function LightboxImagePresentation({ file, phase, url, errors, facts }: LightboxImagePresentationProps) {
  const text = LIGHTBOX_SECTIONS.preview
  const rows = facts.find((fact) => fact.tag === '(0028,0010)')?.value ?? null
  const columns = facts.find((fact) => fact.tag === '(0028,0011)')?.value ?? null
  const size = rows !== null && columns !== null ? `${rows} × ${columns}` : text.aside
  const photometric = facts.find((fact) => fact.tag === '(0028,0004)')?.value ?? null
  return (
    <section className="lightbox-section" aria-labelledby={HEADING_ID}>
      <SectionHead id={HEADING_ID} aside={size}>
        {text.title}
      </SectionHead>
      {phase === 'idle' ? (
        <p className="lightbox-section__none">{text.waiting}</p>
      ) : (
        <div className="lightbox-image">
          <figure className="lightbox-image__frame">
            {url !== null ? (
              <img
                className="lightbox-image__pixels"
                src={url}
                alt={`go-dicom's rendering of ${file ?? 'the file'}${rows !== null && columns !== null ? `: ${rows} rows by ${columns} columns` : ''}${photometric === null ? '' : `, ${photometric}`}.`}
              />
            ) : (
              <p className="lightbox-image__state" role={phase === 'failed' ? 'alert' : 'status'}>
                {phase === 'rendering' && 'go-dicom is rendering the image…'}
                {phase === 'no-pixels' && 'This file holds no Pixel Data element: there is no image to draw.'}
                {phase === 'failed' && 'go-dicom could not render this file.'}
              </p>
            )}
            {phase === 'failed' &&
              errors.map((error) => (
                <p key={error} className="lightbox-image__error">
                  {error}
                </p>
              ))}
            <figcaption className="lightbox-image__caption">
              <code>go-dicom convert --format png</code>
              {file !== null && (
                <>
                  {' '}
                  of <code>{file}</code>
                </>
              )}
            </figcaption>
          </figure>
          <dl className="lightbox-facts">
            {facts.map((fact) => (
              <div key={fact.tag} className="lightbox-facts__row">
                <dt>
                  {fact.label} <code className="lightbox-facts__tag">{fact.tag}</code>
                </dt>
                <dd>{fact.value ?? 'not in the file'}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </section>
  )
}
