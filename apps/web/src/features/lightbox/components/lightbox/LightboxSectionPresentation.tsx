import type { LightboxSectionPresentationProps } from '@features/lightbox/types'
import { LIGHTBOX_SECTIONS } from '@features/lightbox/utils/sections'
import { SectionHead } from '@shared/components/ui'
import './Lightbox.css'

/** One section of the Lightbox, under its own head, with its words until it can draw. */
export function LightboxSectionPresentation({ section }: LightboxSectionPresentationProps) {
  const text = LIGHTBOX_SECTIONS[section]
  const headingId = `lightbox-${section}-h`
  return (
    <section className="lightbox-section" aria-labelledby={headingId}>
      <SectionHead id={headingId} aside={text.aside}>
        {text.title}
      </SectionHead>
      <p className="lightbox-section__none">{text.waiting}</p>
    </section>
  )
}
