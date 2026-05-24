import { readJson } from '../utils/data'
import type { TimeEntry } from '../../composables/usePocStore'

export default defineEventHandler(async () => {
  return await readJson<TimeEntry[]>('time-entries.json')
})
