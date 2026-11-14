import type { InspectorPresentationProps, InspectorTab } from '@features/inspector/types'
import { INSPECTOR_TABS } from '@features/inspector/utils/tabs'
import { Tabs } from '@shared/components/ui'
import './Inspector.css'

const ID_PREFIX = 'inspector-tab'

/** The Bench's Inspector: the File and Wire tabs over one surface, as the panel chrome of every Bench panel. */
export function InspectorPresentation({ tab, onSelectTab, notice, children }: InspectorPresentationProps) {
  return (
    <section aria-label="Inspector" className="inspector">
      <div className="inspector__bar">
        <Tabs
          label="Inspector views"
          items={INSPECTOR_TABS}
          selected={tab}
          onSelect={(id) => onSelectTab(id as InspectorTab)}
          idPrefix={ID_PREFIX}
        />
      </div>
      <div className="inspector__surface" role="tabpanel" aria-labelledby={`${ID_PREFIX}-${tab}`}>
        {notice !== null && (
          <p className="inspector__notice" role="status">
            {notice}
          </p>
        )}
        {notice === null && children}
      </div>
    </section>
  )
}
