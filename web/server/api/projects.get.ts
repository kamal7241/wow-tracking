import { readJson } from '../utils/data'

export default defineEventHandler(async () => {
  return await readJson<any[]>('projects.json')
})
