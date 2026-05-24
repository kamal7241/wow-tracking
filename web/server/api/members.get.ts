import { readJson } from '../utils/data'
import type { Member } from '../../composables/usePocStore'

export default defineEventHandler(async () => {
  return await readJson<Member[]>('members.json')
})
