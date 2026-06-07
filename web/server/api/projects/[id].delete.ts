import { readJson, writeJson } from '../../utils/data'

export default defineEventHandler(async (event) => {
  const projectId = event.context.params?.id as string
  const projects = await readJson<any[]>('projects.json')
  const filtered = projects.filter((p) => p.id !== projectId)
  await writeJson('projects.json', filtered)
  return { success: true }
})
