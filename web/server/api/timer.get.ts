import { readJson } from '../utils/data'
import type { TimeEntry } from '../../composables/usePocStore'

export default defineEventHandler(async (): Promise<TimeEntry | null> => {
  try {
    return await readJson<TimeEntry | null>('timer.json')
  } catch {
    return null
  }
})
