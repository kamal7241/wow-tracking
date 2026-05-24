import { readJson, writeJson } from '../../utils/data'
import type { Task } from '../../../composables/usePocStore'

export default defineEventHandler(async (event) => {
  const taskId = event.context.params?.id as string
  const tasks = await readJson<Task[]>('tasks.json')
  const filtered = tasks.filter((task) => task.id !== taskId)
  await writeJson('tasks.json', filtered)
  return { success: true }
})
