import { readJson } from '../utils/data'
import type { Task } from '../../composables/usePocStore'

export default defineEventHandler(async () => {
  return await readJson<Task[]>('tasks.json')
})
