import { readJson, writeJson, ensureId } from '../utils/data'
import type { Task } from '../../composables/usePocStore'

export default defineEventHandler(async (event) => {
  const body = await readBody<Task>(event)
  const tasks = await readJson<Task[]>('tasks.json')
  const newTask = ensureId({ ...body })
  tasks.unshift(newTask)
  await writeJson('tasks.json', tasks)
  return newTask
})
