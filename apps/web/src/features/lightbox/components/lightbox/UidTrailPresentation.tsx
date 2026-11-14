import type { UidTrailPresentationProps } from '@features/lightbox/types'
import { LIGHTBOX_SECTIONS, UID_WIRE_WAITING } from '@features/lightbox/utils/sections'
import { SectionHead } from '@shared/components/ui'
import './Lightbox.css'

const HEADING_ID = 'lightbox-uids-h'

/**
 * The instance's identity, Study ▸ Series ▸ SOP Instance, where it appears. On disk it is read
 * from the file by go-dicom; on the wire it waits for the network stages and says so.
 */
export function UidTrailPresentation({ file, uids }: UidTrailPresentationProps) {
  const text = LIGHTBOX_SECTIONS.uids
  return (
    <section className="lightbox-section" aria-labelledby={HEADING_ID}>
      <SectionHead id={HEADING_ID} aside={text.aside}>
        {text.title}
      </SectionHead>
      {uids === null ? (
        <p className="lightbox-section__none">{text.waiting}</p>
      ) : (
        <div className="uid-trail">
          <h3 className="uid-trail__where">
            On disk {file !== null && <code className="uid-trail__file">{file}</code>}
          </h3>
          <ol className="uid-trail__list">
            {uids.map((uid) => (
              <li key={uid.tag} className="uid-trail__step">
                <span className="uid-trail__label">
                  {uid.label} <code className="uid-trail__tag">{uid.tag}</code>
                </span>
                <code className="uid-trail__uid">{uid.value ?? 'not in the file'}</code>
              </li>
            ))}
          </ol>
          <h3 className="uid-trail__where">On the wire</h3>
          <p className="lightbox-section__none">{UID_WIRE_WAITING}</p>
        </div>
      )}
    </section>
  )
}
