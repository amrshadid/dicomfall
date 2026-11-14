import { describe, expect, it } from 'vitest'
import { parse } from 'yaml'
import { recordedMissions, recordedRuns } from '#test/recorded-runs'
import { appContent } from '#utils/loader/app-content.util'
import { validateSolution } from '#utils/run/golden-run.util'
import { objectivesMet, rejudgeRun } from '#utils/run/recorded-run.util'

// Runs recorded on the real Machine by `pnpm --filter @dicomfall/missions vm:golden`, judged again
// here without a VM from go-dicom's readings as they were taken: a change to the checks that
// flips a verdict fails here. One suite per mission.
const loaded = appContent()
if (!loaded.ok) {
  throw new Error(loaded.errors.join('\n'))
}
const { game } = loaded.value
const solutions = import.meta.glob<string>('../../content/*/*/solution.yaml', {
  query: '?raw',
  import: 'default',
  eager: true,
})

for (const missionId of recordedMissions()) {
  const mission = game.missions.find((candidate) => candidate.id === missionId)
  const { runs, table } = recordedRuns(missionId)
  describe(`${missionId}: golden runs, judged again`, () => {
    it('is a mission of the game', () => {
      expect(mission?.id).toBe(missionId)
    })
    if (mission === undefined) {
      return
    }
    const folder = loaded.value.folderOf(missionId) ?? ''
    const solution = validateSolution(parse(solutions[`../../content/${folder}/solution.yaml`] ?? ''), mission)

    // A run the Machine did not judge as solution.yaml says is not written: vm:golden reports it.
    it('records only runs of solution.yaml, each for this version of the mission', () => {
      const ids = new Set(solution.ok ? solution.value.map((run) => run.id) : [])
      for (const run of runs) {
        expect([run.run, ids.has(run.run)]).toEqual([run.run, true])
        expect([run.run, run.version]).toEqual([run.run, mission.version])
      }
    })

    for (const run of runs) {
      it(`${run.run}: ${run.passes ? 'passes' : 'does not pass'}, meeting what it met on the Machine`, () => {
        const verdict = rejudgeRun(mission, run, table)
        expect(verdict.passed).toBe(run.passes)
        expect(objectivesMet(verdict)).toEqual(run.objectives)
      })
    }

    it('meets no objective as the lab starts, in any run', () => {
      for (const run of runs) {
        const atStart = rejudgeRun(mission, { ...run, steps: run.steps.slice(0, 1) }, table)
        expect([run.run, Object.values(objectivesMet(atStart)).some(Boolean)]).toEqual([run.run, false])
      }
    })
  })
}
