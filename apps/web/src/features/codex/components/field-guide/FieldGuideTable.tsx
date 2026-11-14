import type { FieldGuideRow } from '@features/codex/types'
import { InlineText } from '@shared/components/ui'
import './FieldGuideTable.css'

export interface FieldGuideTableProps {
  rows: readonly FieldGuideRow[]
}

/** The commands met so far: whose each is, what it does, and where it is taught. */
export function FieldGuideTable({ rows }: FieldGuideTableProps) {
  return (
    <div className="field-guide">
      <p className="field-guide__lead">
        Every command you have met, go-dicom's and the AE's Linux shell's, with what it does.
      </p>
      <table className="field-guide__table">
        <caption>Field Guide</caption>
        <thead>
          <tr>
            <th scope="col">Command</th>
            <th scope="col">Kind</th>
            <th scope="col">What it does</th>
            <th scope="col">First met</th>
            <th scope="col">Used again in</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${row.where}-${row.name}`}>
              <th scope="row">
                <code>{row.name}</code>
              </th>
              <td>{row.where}</td>
              <td>
                <InlineText text={row.what} />
              </td>
              <td>{row.firstMet}</td>
              <td>{row.deepenedIn.join(', ')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
