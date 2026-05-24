import { readJson, writeJson } from '../../utils/data'
import { createError } from 'h3'
import type { Task } from '../../../composables/usePocStore'

export default defineEventHandler(async (event) => {
  const taskId = event.context.params?.id as string
  const body = await readBody<Task>(event)
  const tasks = await readJson<Task[]>('tasks.json')
  const index = tasks.findIndex((task) => task.id === taskId)
  if (index === -1) {
    throw createError({ statusCode: 404, statusMessage: 'Task not found' })
  }
  tasks[index] = { ...tasks[index], ...body }
  await writeJson('tasks.json', tasks)
  return tasks[index]
})
