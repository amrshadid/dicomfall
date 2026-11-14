import type { RoadShape } from '@features/map/types'
import './Marks.css'

/** The road through the stops: inked where travelled, dashed ahead. */
export function RoadPath({ road }: { road: RoadShape }) {
  return (
    <>
      {road.reached !== '' && <path d={road.reached} className="df-road" />}
      <path d={road.ahead} className="df-road df-road--ahead" />
    </>
  )
}
