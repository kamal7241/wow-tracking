import { computed } from 'vue'

export type TaskStatus = 'todo' | 'in-progress' | 'in-review' | 'done'
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical'

export interface Task {
  id: string
  title: string
  description: string
  status: TaskStatus
  priority: TaskPriority
  assigneeId: string
  dueDate: string
  estimatedHours?: number
}

export interface TimeEntry {
  id: string
  taskId: string
  taskTitle: string
  memberId: string
  startedAt: string
  stoppedAt: string
  durationMinutes: number
  notes: string
  billable: boolean
}

export interface Member {
  id: string
  name: string
  role: string
  initials: string
}

export const usePocStore = () => {
  const tasks = useState<Task[]>('poc-tasks', () => [])
  const members = useState<Member[]>('poc-members', () => [])
  const timeEntries = useState<TimeEntry[]>('poc-time-entries', () => [])
  const activeTimer = useState<TimeEntry | null>('poc-active-timer', () => null)
  const loading = useState<boolean>('poc-loading', () => false)

  const activeTask = computed(() => {
    return tasks.value.find((task) => task.id === activeTimer.value?.taskId) ?? null
  })

  const activeDurationMinutes = computed(() => {
    if (!activeTimer.value) return 0
    const started = new Date(activeTimer.value.startedAt).getTime()
    const diff = Date.now() - started
    return Math.max(1, Math.floor(diff / 60000))
  })

  const loadAll = async () => {
    loading.value = true
    try {
      await Promise.all([fetchTasks(), fetchMembers(), fetchTimeEntries(), fetchActiveTimer()])
    } finally {
      loading.value = false
    }
  }

  const fetchTasks = async () => {
    const data = await $fetch<Task[]>('/api/tasks')
    tasks.value = data
    return data
  }

  const fetchMembers = async () => {
    const data = await $fetch<Member[]>('/api/members')
    members.value = data
    return data
  }

  const fetchTimeEntries = async () => {
    const data = await $fetch<TimeEntry[]>('/api/time-entries')
    timeEntries.value = data
    return data
  }

  const fetchActiveTimer = async () => {
    const data = await $fetch<TimeEntry | null>('/api/timer')
    activeTimer.value = data
    return data
  }

  const createTask = async (task: Omit<Task, 'id'>) => {
    const data = await $fetch<Task>('/api/tasks', {
      method: 'POST',
      body: task,
    })
    tasks.value.unshift(data)
    return data
  }

  const updateTask = async (task: Task) => {
    const data = await $fetch<Task>(`/api/tasks/${task.id}`, {
      method: 'PUT',
      body: task,
    })
    tasks.value = tasks.value.map((item) => (item.id === data.id ? data : item))
    return data
  }

  const deleteTask = async (taskId: string) => {
    await $fetch(`/api/tasks/${taskId}`, { method: 'DELETE' })
    tasks.value = tasks.value.filter((task) => task.id !== taskId)
  }

  const createTimeEntry = async (entry: Omit<TimeEntry, 'id'>) => {
    const data = await $fetch<TimeEntry>('/api/time-entries', {
      method: 'POST',
      body: entry,
    })
    timeEntries.value.unshift(data)
    return data
  }

  const deleteTimeEntry = async (entryId: string) => {
    await $fetch(`/api/time-entries/${entryId}`, { method: 'DELETE' })
    timeEntries.value = timeEntries.value.filter((entry) => entry.id !== entryId)
  }

  const startTimer = async (task: Task) => {
    const timer = await $fetch<TimeEntry>('/api/timer', {
      method: 'POST',
      body: { taskId: task.id, taskTitle: task.title, memberId: task.assigneeId },
    })
    activeTimer.value = timer
    if (task.status === 'todo') {
      await updateTask({ ...task, status: 'in-progress' })
    }
  }

  const stopTimer = async () => {
    if (!activeTimer.value) return null
    const entry = await $fetch<TimeEntry | null>('/api/timer', { method: 'DELETE' })
    activeTimer.value = null
    if (entry) timeEntries.value = [entry, ...timeEntries.value]
    return entry
  }

  return {
    tasks,
    members,
    timeEntries,
    activeTimer,
    activeTask,
    activeDurationMinutes,
    loading,
    loadAll,
    fetchTasks,
    fetchMembers,
    fetchTimeEntries,
    fetchActiveTimer,
    createTask,
    updateTask,
    deleteTask,
    startTimer,
    stopTimer,
    createTimeEntry,
    deleteTimeEntry,
  }
}
