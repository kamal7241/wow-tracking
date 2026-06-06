import { computed } from 'vue'

export type TaskStatus = 'todo' | 'in-progress' | 'in-review' | 'done'
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical'
export type SubtaskStatus = 'todo' | 'in-progress' | 'done'

export interface Subtask {
  id: string
  title: string
  status: SubtaskStatus
  assigneeId?: string
  estimatedHours?: number
}

export interface Task {
  id: string
  title: string
  description: string
  status: TaskStatus
  priority: TaskPriority
  assigneeId?: string
  dueDate: string
  estimatedHours?: number
  project?: string
  subtasks?: Subtask[]
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
  subtaskId?: string
  subtaskTitle?: string
}

export interface EvaluationCriteria {
  name: string
  stars: number
}

export interface ProfileLink {
  label: string
  url: string
}

export interface BasicInfo {
  email?: string
  phone?: string
  department?: string
  location?: string
  joinDate?: string
}

export interface ProjectHistory {
  name: string
  role: string
  period: string
  status: 'completed' | 'active' | 'on-hold'
}

export interface RmdItem {
  name: string
  progress: number
}

export interface Member {
  id: string
  name: string
  role: string
  initials: string
  experienceStars?: number
  performanceStars?: number
  bimKnowledge?: string
  commitment?: string
  rmdProgress?: number // Overall percentage from 0 to 100
  rmdDetails?: RmdItem[]
  links?: ProfileLink[]
  evaluationCriteria?: EvaluationCriteria[]
  basicInfo?: BasicInfo
  projectsHistory?: ProjectHistory[]
}

export const usePocStore = () => {
  const tasks = useState<Task[]>('poc-tasks', () => [])
  const members = useState<Member[]>('poc-members', () => [])
  const timeEntries = useState<TimeEntry[]>('poc-time-entries', () => [])
  const activeTimers = useState<TimeEntry[]>('poc-active-timers', () => [])
  const loading = useState<boolean>('poc-loading', () => false)

  // Backward-compat single-timer view (first active timer)
  const activeTimer = computed(() => activeTimers.value[0] ?? null)

  const activeTask = computed(() => {
    const id = activeTimers.value[0]?.taskId
    return id ? tasks.value.find((task) => task.id === id) ?? null : null
  })

  const activeDurationMinutes = computed(() => {
    const first = activeTimers.value[0]
    if (!first) return 0
    const started = new Date(first.startedAt).getTime()
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
    const data = await $fetch<TimeEntry[]>('/api/timer')
    activeTimers.value = Array.isArray(data) ? data : (data ? [data as TimeEntry] : [])
    return activeTimers.value
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

  const startTimer = async (task: Task, subtask?: Subtask) => {
    const timer = await $fetch<TimeEntry>('/api/timer', {
      method: 'POST',
      body: {
        taskId: task.id,
        taskTitle: task.title,
        memberId: subtask?.assigneeId ?? task.assigneeId ?? '',
        subtaskId: subtask?.id,
        subtaskTitle: subtask?.title,
      },
    })
    activeTimers.value = [...activeTimers.value, timer]
    if (subtask) {
      const subtasks = (task.subtasks ?? []).map((s) =>
        s.id === subtask.id ? { ...s, status: 'in-progress' as SubtaskStatus } : s,
      )
      await updateTask({ ...task, subtasks })
    }
  }

  const stopTimer = async (subtaskId?: string) => {
    if (!activeTimers.value.length) return null
    const query = subtaskId ? `?subtaskId=${encodeURIComponent(subtaskId)}` : ''
    const result = await $fetch<TimeEntry | TimeEntry[] | null>(`/api/timer${query}`, { method: 'DELETE' })
    if (subtaskId) {
      activeTimers.value = activeTimers.value.filter((t) => t.subtaskId !== subtaskId)
    } else {
      activeTimers.value = []
    }
    const entries = result ? (Array.isArray(result) ? result : [result]) : []
    if (entries.length) timeEntries.value = [...entries, ...timeEntries.value]
    return entries[0] ?? null
  }

  return {
    tasks,
    members,
    timeEntries,
    activeTimers,
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
