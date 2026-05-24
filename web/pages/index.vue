<template>
  <section>
    <div class="page-header">
      <div>
        <h2 class="page-title">Kanban board</h2>
        <p class="page-subtitle">Manage tasks, assign team members, and start the timer directly from each card.</p>
      </div>
      <button class="button" @click="openTaskDialog">Add task</button>
    </div>

    <div class="board-controls">
      <div class="field">
        <label for="search">Search tasks</label>
        <input id="search" v-model="filters.query" placeholder="Search by title, description, or assignee" />
      </div>
      <div class="field">
        <label for="assigneeFilter">Assignee</label>
        <select id="assigneeFilter" v-model="filters.assigneeId">
          <option value="">All members</option>
          <option v-for="member in members" :key="member.id" :value="member.id">{{ member.name }}</option>
        </select>
      </div>
    </div>

    <div class="panel">
      <div class="grid-cols-4">
        <section
          v-for="status in statuses"
          :key="status.key"
          :class="['column-card', { 'column-card--over': (dragEnterCounts[status.key] ?? 0) > 0 }]"
          @dragover.prevent
          @dragenter="dragEnterCounts[status.key] = (dragEnterCounts[status.key] ?? 0) + 1"
          @dragleave="dragEnterCounts[status.key] = Math.max(0, (dragEnterCounts[status.key] ?? 0) - 1)"
          @drop="() => onDrop(status.key)"
        >
          <div class="column-header">
            <h3 class="column-title">{{ status.label }}</h3>
            <span class="column-meta">{{ tasksByStatus(status.key).length }}</span>
          </div>

          <div class="column-content" style="display:grid;gap:12px;">
            <div v-if="tasksByStatus(status.key).length === 0" class="column-empty">No tasks yet</div>
            <article
              v-for="task in tasksByStatus(status.key)"
              :key="task.id"
              :class="['task-card', { 'task-card--active': activeTask?.id === task.id, 'task-card--overdue': isOverdue(task) }]"
              draggable="true"
              @dragstart="() => onDragStart(task)"
            >
              <div class="task-title-row">
                <h4 class="task-title">{{ task.title }}</h4>
                <span :class="['badge', task.priority]">{{ priorityLabels[task.priority] }}</span>
              </div>
              <p class="task-meta">{{ task.description }}</p>

              <div class="task-meta">
                <span class="status-chip">{{ statusLabels[task.status] }}</span>
                <span>{{ formatDate(task.dueDate) }}</span>
              </div>

              <div class="task-meta">
                <div class="assignee">
                  <span class="avatar">{{ memberInitials(task.assigneeId) }}</span>
                  {{ memberName(task.assigneeId) }}
                </div>
              </div>

              <div v-if="task.estimatedHours" class="task-progress">
                <div class="task-progress-info">
                  <span class="timer-elapsed">⏱ {{ taskLoggedHours(task.id) ?? '0h' }} logged</span>
                  <span style="color:var(--muted);">{{ task.estimatedHours }}h est</span>
                </div>
                <div class="task-progress-bar">
                  <div
                    class="task-progress-fill"
                    :class="{ 'task-progress-fill--over': taskProgressPct(task.id, task.estimatedHours) >= 100 }"
                    :style="{ width: taskProgressPct(task.id, task.estimatedHours) + '%' }"
                  ></div>
                </div>
              </div>
              <div v-else-if="taskLoggedHours(task.id)" class="task-meta">
                <span class="timer-elapsed">⏱ {{ taskLoggedHours(task.id) }} logged</span>
              </div>

              <div class="task-actions">
                <button class="button button-secondary" type="button" @click="openEditDialog(task)">Edit</button>
                <button class="button button-secondary" type="button" @click="deleteTask(task.id)">Delete</button>
              </div>

              <div v-if="activeTask?.id === task.id" class="timer-elapsed">⏱ {{ elapsedDisplay }}</div>
              <button :class="['tracker-button', { 'tracker-button--active': activeTask?.id === task.id }]"
                type="button" @click="toggleTaskTimer(task)">
                {{ activeTask?.id === task.id ? 'Stop timer' : 'Start timer' }}
              </button>
            </article>
          </div>
          <button class="column-add-btn" type="button" @click="openTaskDialogForStatus(status.key)">+ Add task</button>
        </section>
      </div>
    </div>

    <div class="panel">
      <div class="page-header">
        <div>
          <h2 class="page-title">Status guide</h2>
          <p class="page-subtitle">Use the board to move tasks through the workflow: To Do → In Progress → In Review → Done.</p>
        </div>
      </div>
      <div class="summary-grid">
        <div class="summary-card">
          <p class="summary-title">Total tasks</p>
          <p class="summary-value">{{ tasks.length }}</p>
        </div>
        <div class="summary-card">
          <p class="summary-title">Active timer</p>
          <p class="summary-value">{{ activeTask ? elapsedDisplay : 'None' }}</p>
        </div>
        <div class="summary-card">
          <p class="summary-title">Team members</p>
          <p class="summary-value">{{ members.length }}</p>
        </div>
      </div>
    </div>

    <div v-if="showDialog" class="modal-backdrop" @click.self="closeDialog">
      <div class="modal">
        <h3>{{ isEditing ? 'Edit task' : 'Create new task' }}</h3>
        <div class="field">
          <label for="title">Title</label>
          <input id="title" v-model="form.title" placeholder="Task name" />
        </div>
        <div class="field">
          <label for="description">Description</label>
          <textarea id="description" v-model="form.description" placeholder="Task details"></textarea>
        </div>
        <div class="form-row">
          <div class="field">
            <label for="assignee">Assignee</label>
            <select id="assignee" v-model="form.assigneeId">
              <option v-for="member in members" :key="member.id" :value="member.id">{{ member.name }}</option>
            </select>
          </div>
          <div class="field">
            <label for="priority">Priority</label>
            <select id="priority" v-model="form.priority">
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="field">
            <label for="status">Status</label>
            <select id="status" v-model="form.status">
              <option value="todo">To Do</option>
              <option value="in-progress">In Progress</option>
              <option value="in-review">In Review</option>
              <option value="done">Done</option>
            </select>
          </div>
          <div class="field">
            <label for="dueDate">Due date</label>
            <input id="dueDate" type="date" v-model="form.dueDate" />
          </div>
        </div>
        <div class="form-row">
          <div class="field">
            <label for="estimatedHours">Estimated hours</label>
            <input id="estimatedHours" type="number" min="0.5" step="0.5" v-model.number="form.estimatedHours" placeholder="e.g. 4" />
          </div>
        </div>
        <div class="field">
          <button class="button" @click="submitTask">{{ isEditing ? 'Update task' : 'Save task' }}</button>
          <button class="button button-secondary" @click="closeDialog" type="button">Cancel</button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, watchEffect } from 'vue'
import { usePocStore, type Task, type TaskStatus, type TaskPriority } from '@/composables/usePocStore'

const store = usePocStore()
const tasks = store.tasks
const members = store.members
const timeEntries = store.timeEntries
const showDialog = ref(false)
const draggedTaskId = ref<string | null>(null)
const editingTaskId = ref<string | null>(null)
const dragEnterCounts = reactive<Record<string, number>>({})
const now = ref(Date.now())
let clockInterval: ReturnType<typeof setInterval> | null = null
const isEditing = computed(() => !!editingTaskId.value)

const statuses: { key: TaskStatus; label: string }[] = [
  { key: 'todo', label: 'To Do' },
  { key: 'in-progress', label: 'In Progress' },
  { key: 'in-review', label: 'In Review' },
  { key: 'done', label: 'Done' },
]

const statusLabels: Record<TaskStatus, string> = {
  todo: 'To Do',
  'in-progress': 'In Progress',
  'in-review': 'In Review',
  done: 'Done',
}

const priorityLabels: Record<TaskPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
}

const form = reactive({
  title: '',
  description: '',
  priority: 'medium' as TaskPriority,
  assigneeId: '',
  status: 'todo' as TaskStatus,
  dueDate: '',
  estimatedHours: undefined as number | undefined,
})

const filters = reactive({
  query: '',
  assigneeId: '',
})

const filteredTasks = computed(() => {
  const query = filters.query.trim().toLowerCase()
  return tasks.value.filter((task) => {
    if (filters.assigneeId && task.assigneeId !== filters.assigneeId) {
      return false
    }

    if (!query) {
      return true
    }

    const assignee = memberName(task.assigneeId).toLowerCase()
    return [
      task.title.toLowerCase(),
      task.description.toLowerCase(),
      statusLabels[task.status].toLowerCase(),
      assignee,
    ].some((value) => value.includes(query))
  })
})

const tasksByStatus = (status: TaskStatus) => {
  return filteredTasks.value.filter((task) => task.status === status)
}

const activeTask = store.activeTask

const memberName = (memberId: string) => {
  return members.value.find((member) => member.id === memberId)?.name ?? 'Unassigned'
}

const formatDate = (iso: string) => {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(iso))
}

const isOverdue = (task: Task) => {
  if (task.status === 'done') return false
  return new Date(task.dueDate) < new Date(new Date().toDateString())
}

const memberInitials = (memberId: string) => {
  return members.value.find((m) => m.id === memberId)?.initials ?? '?'
}

const taskLoggedHours = (taskId: string): string | null => {
  const mins = timeEntries.value
    .filter((e) => e.taskId === taskId)
    .reduce((sum, e) => sum + e.durationMinutes, 0)
  if (mins === 0) return null
  const h = mins / 60
  return h % 1 === 0 ? `${h}h` : `${h.toFixed(1)}h`
}

const taskProgressPct = (taskId: string, estimatedHours: number): number => {
  const mins = timeEntries.value
    .filter((e) => e.taskId === taskId)
    .reduce((sum, e) => sum + e.durationMinutes, 0)
  return Math.min(100, Math.round((mins / (estimatedHours * 60)) * 100))
}

const elapsedDisplay = computed(() => {
  const timer = store.activeTimer.value
  if (!timer?.startedAt) return '0:00:00'
  const diff = Math.max(0, now.value - new Date(timer.startedAt).getTime())
  const totalSeconds = Math.floor(diff / 1000)
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
})

const openTaskDialog = () => {
  editingTaskId.value = null
  resetForm()
  showDialog.value = true
}

const openEditDialog = (task: Task) => {
  editingTaskId.value = task.id
  form.title = task.title
  form.description = task.description
  form.priority = task.priority
  form.assigneeId = task.assigneeId
  form.status = task.status
  form.dueDate = task.dueDate
  form.estimatedHours = task.estimatedHours
  showDialog.value = true
}

const closeDialog = () => {
  showDialog.value = false
  resetForm()
}

const resetForm = () => {
  editingTaskId.value = null
  form.title = ''
  form.description = ''
  form.priority = 'medium'
  form.assigneeId = members.value[0]?.id ?? ''
  form.status = 'todo'
  form.dueDate = new Date().toISOString().slice(0, 10)
  form.estimatedHours = undefined
}

const submitTask = async () => {
  if (!form.title.trim() || !form.assigneeId) return
  const payload = {
    title: form.title,
    description: form.description,
    status: form.status,
    priority: form.priority,
    assigneeId: form.assigneeId,
    dueDate: form.dueDate || new Date().toISOString().slice(0, 10),
    estimatedHours: form.estimatedHours || undefined,
  }

  if (editingTaskId.value) {
    await store.updateTask({ ...payload, id: editingTaskId.value } as Task)
  } else {
    await store.createTask(payload)
  }

  resetForm()
  closeDialog()
}

const deleteTask = async (taskId: string) => {
  const confirmed = confirm('Delete this task? This cannot be undone.')
  if (!confirmed) return
  await store.deleteTask(taskId)
  if (editingTaskId.value === taskId) {
    closeDialog()
  }
}

const onDragStart = (task: Task) => {
  draggedTaskId.value = task.id
}

const onDrop = async (status: TaskStatus) => {
  dragEnterCounts[status] = 0
  if (!draggedTaskId.value) return
  const task = tasks.value.find((item) => item.id === draggedTaskId.value)
  if (!task) return
  if (task.status !== status) {
    await store.updateTask({ ...task, status })
  }
  draggedTaskId.value = null
}

const toggleTaskTimer = async (task: Task) => {
  if (activeTask.value?.id === task.id) {
    await store.stopTimer()
  } else {
    if (store.activeTimer.value) {
      await store.stopTimer()
    }
    await store.startTimer(task)
  }
}

const openTaskDialogForStatus = (statusKey: string) => {
  editingTaskId.value = null
  resetForm()
  form.status = statusKey as TaskStatus
  showDialog.value = true
}

onMounted(async () => {
  await store.loadAll()
  if (!form.assigneeId && members.value.length) {
    form.assigneeId = members.value[0]?.id ?? ''
  }
  clockInterval = setInterval(() => { now.value = Date.now() }, 1000)
})

onUnmounted(() => {
  if (clockInterval) clearInterval(clockInterval)
})

watchEffect(() => {
  if (!form.assigneeId && members.value.length) {
    form.assigneeId = members.value[0]?.id ?? ''
  }
})
</script>
