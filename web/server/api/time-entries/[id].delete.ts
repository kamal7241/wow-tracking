import { readJson, writeJson } from '../../utils/data'
import type { TimeEntry } from '../../../composables/usePocStore'

export default defineEventHandler(async (event) => {
  const entryId = event.context.params?.id as string
  const entries = await readJson<TimeEntry[]>('time-entries.json')
  const filtered = entries.filter((entry) => entry.id !== entryId)
  await writeJson('time-entries.json', filtered)
  return { success: true }
})
