import { readJson, writeJson } from '../utils/data'
import type { TimeEntry } from '../../composables/usePocStore'

export default defineEventHandler(async (): Promise<TimeEntry | null> => {
  const timer = await readJson<TimeEntry | null>('timer.json').catch(() => null)
  if (!timer) return null

  const stoppedAt = new Date().toISOString()
  const durationMinutes = Math.max(1, Math.floor(
    (new Date(stoppedAt).getTime() - new Date(timer.startedAt).getTime()) / 60000,
  ))

  const entry: TimeEntry = {
    ...timer,
    id: crypto.randomUUID(),
    stoppedAt,
    durationMinutes,
  }

  const entries = await readJson<TimeEntry[]>('time-entries.json')
  entries.unshift(entry)
  await writeJson('time-entries.json', entries)
  await writeJson('timer.json', null)

  return entry
})
