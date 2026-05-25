import { readJson, writeJson } from '../utils/data'
import type { TimeEntry } from '../../composables/usePocStore'

export default defineEventHandler(async (event): Promise<TimeEntry> => {
  const body = await readBody<{
    taskId: string
    taskTitle: string
    memberId: string
    subtaskId?: string
    subtaskTitle?: string
  }>(event)

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
    ...(body.subtaskId ? { subtaskId: body.subtaskId, subtaskTitle: body.subtaskTitle } : {}),
  }

  const existing = await readJson<TimeEntry | TimeEntry[]>('timer.json').catch(() => [])
  const timers: TimeEntry[] = Array.isArray(existing) ? existing : (existing ? [existing] : [])
  timers.push(timer)
  await writeJson('timer.json', timers)
  return timer
})
