import { readJson } from '../utils/data'
import type { TimeEntry } from '../../composables/usePocStore'

export default defineEventHandler(async (): Promise<TimeEntry[]> => {
  try {
    const data = await readJson<TimeEntry | TimeEntry[] | null>('timer.json')
    if (!data) return []
    return Array.isArray(data) ? data : [data]
  } catch {
    return []
  }
})
