import { readJson, writeJson, ensureId } from '../utils/data'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const projects = await readJson<any[]>('projects.json')
  const newProject = ensureId({ ...body, createdAt: new Date().toISOString() })
  projects.unshift(newProject)
  await writeJson('projects.json', projects)
  return newProject
})
