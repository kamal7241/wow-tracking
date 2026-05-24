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
      await Promise.all([fetchTasks(), fetchMembers(), fetchTimeEntries()])
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

  const startTimer = async (task: Task) => {
    activeTimer.value = {
      id: `${task.id}-${Date.now()}`,
      taskId: task.id,
      taskTitle: task.title,
      memberId: task.assigneeId,
      startedAt: new Date().toISOString(),
      stoppedAt: '',
      durationMinutes: 0,
      notes: 'Live tracking',
      billable: true,
    }
  }

  const stopTimer = async () => {
    if (!activeTimer.value) return null
    const durationMinutes = activeDurationMinutes.value
    const entry: Omit<TimeEntry, 'id'> = {
      ...activeTimer.value,
      stoppedAt: new Date().toISOString(),
      durationMinutes,
    }
    activeTimer.value = null
    return await createTimeEntry(entry)
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
    createTask,
    updateTask,
    deleteTask,
    startTimer,
    stopTimer,
    createTimeEntry,
  }
}
