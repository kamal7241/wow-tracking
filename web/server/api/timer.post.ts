import { writeJson } from '../utils/data'
import type { TimeEntry } from '../../composables/usePocStore'

export default defineEventHandler(async (event): Promise<TimeEntry> => {
  const body = await readBody<{ taskId: string; taskTitle: string; memberId: string }>(event)

  const timer: TimeEntry = {
    id: `timer-${Date.now()}`,
    taskId: body.taskId,
    taskTitle: body.taskTitle,
    memberId: body.memberId,
    startedAt: new Date().toISOString(),
    stoppedAt: '',
    durationMinutes: 0,
    notes: 'Live tracking',
    billable: true,
  }

  await writeJson('timer.json', timer)
  return timer
})
