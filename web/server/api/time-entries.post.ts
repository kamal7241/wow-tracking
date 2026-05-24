import { readJson, writeJson, ensureId } from '../utils/data'
import type { TimeEntry } from '../../composables/usePocStore'

export default defineEventHandler(async (event) => {
  const body = await readBody<Omit<TimeEntry, 'id'>>(event)
  const entries = await readJson<TimeEntry[]>('time-entries.json')
  const newEntry = ensureId({ ...body })
  entries.unshift(newEntry)
  await writeJson('time-entries.json', entries)
  return newEntry
})
