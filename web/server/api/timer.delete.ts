import { readJson, writeJson } from '../utils/data'
import type { TimeEntry } from '../../composables/usePocStore'

export default defineEventHandler(async (event): Promise<TimeEntry | TimeEntry[] | null> => {
  const { subtaskId } = getQuery(event) as { subtaskId?: string }

  const existing = await readJson<TimeEntry | TimeEntry[] | null>('timer.json').catch(() => null)
  if (!existing) return null

  const timers: TimeEntry[] = Array.isArray(existing) ? [...existing] : [existing as TimeEntry]
  const stoppedAt = new Date().toISOString()

  const toEntry = (timer: TimeEntry): TimeEntry => ({
    ...timer,
    id: crypto.randomUUID(),
    stoppedAt,
    durationMinutes: Math.max(1, Math.floor(
      (new Date(stoppedAt).getTime() - new Date(timer.startedAt).getTime()) / 60000,
    )),
  })

  if (subtaskId) {
    const idx = timers.findIndex((t) => t.subtaskId === subtaskId)
    if (idx === -1) return null
    const [timer] = timers.splice(idx, 1)
    const entry = toEntry(timer)
    const entries = await readJson<TimeEntry[]>('time-entries.json')
    entries.unshift(entry)
    await writeJson('time-entries.json', entries)
    await writeJson('timer.json', timers)
    return entry
  } else {
    const stopped = timers.map(toEntry)
    const entries = await readJson<TimeEntry[]>('time-entries.json')
    await writeJson('time-entries.json', [...stopped, ...entries])
    await writeJson('timer.json', [])
    return stopped.length > 0 ? stopped : null
  }
})
