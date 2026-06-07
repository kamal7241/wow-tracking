import { readJson, writeJson } from '../../utils/data'
import { createError } from 'h3'

export default defineEventHandler(async (event) => {
  const projectId = event.context.params?.id as string
  const body = await readBody(event)
  const projects = await readJson<any[]>('projects.json')
  const index = projects.findIndex((p) => p.id === projectId)
  if (index === -1) {
    throw createError({ statusCode: 404, statusMessage: 'Project not found' })
  }
  projects[index] = { ...projects[index], ...body }
  await writeJson('projects.json', projects)
  return projects[index]
})
