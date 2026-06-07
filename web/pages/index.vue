<template>
  <section>
    <div class="page-header">
      <div>
        <h2 class="page-title">Kanban board</h2>
        <p class="page-subtitle">Manage tasks, assign team members, and start the timer directly from each card.</p>
      </div>
      <button class="button button--compact" @click="openTaskDialog">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Add feature
      </button>
    </div>

    <div class="board-controls">
      <div class="field">
        <label for="projectFilter">Project</label>
        <select id="projectFilter" v-model="selectedProjectId" class="project-select">
          <option value="">All Projects</option>
          <option v-for="p in projects" :key="p.id" :value="p.id">{{ p.name }}</option>
        </select>
      </div>
      <div class="field">
        <label for="search">Search tasks</label>
        <input id="search" v-model="filters.query" placeholder="Search by title, description, or assignee" />
      </div>
      <div class="field">
        <label for="assigneeFilter">Assignee</label>
        <select id="assigneeFilter" v-model="filters.assigneeId">
          <option value="">All members</option>
          <option v-for="member in displayMembers" :key="member.id" :value="member.id">{{ member.name }}</option>
        </select>
      </div>
    </div>

    <div class="panel" style="overflow-x: auto; padding-bottom: 6px;">
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
              :class="['task-card', { 'task-card--active': isFeatureTracking(task), 'task-card--overdue': isOverdue(task) }]"
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

              <!-- Assignees from child tasks -->
              <div v-if="featureAssignees(task).length" class="task-meta">
                <div class="assignees-stack">
                  <span
                    v-for="m in featureAssignees(task)"
                    :key="m.id"
                    class="avatar"
                    :title="m.name"
                  >{{ m.initials }}</span>
                  <span class="assignees-label">{{ featureAssignees(task).map(m => m.name).join(', ') }}</span>
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

              <!-- Subtask progress bar (always visible when subtasks exist) -->
              <div
                v-if="(task.subtasks?.length ?? 0) > 0"
                class="subtask-bar"
                @click.stop="toggleExpand(task.id)"
                :title="expandedTaskIds.includes(task.id) ? 'Collapse tasks' : 'Expand tasks'"
              >
                <div class="subtask-bar-info">
                  <span class="subtask-icon">⊞</span>
                  <span class="subtask-count">{{ subtaskDoneCount(task) }} / {{ task.subtasks!.length }}</span>
                  <span class="subtask-label">tasks</span>
                  <span v-if="featureTotalEstimate(task)" class="subtask-total-est">{{ featureTotalEstimate(task) }}</span>
                  <span class="subtask-chevron">{{ expandedTaskIds.includes(task.id) ? '▲' : '▼' }}</span>
                </div>
                <div class="subtask-progress">
                  <div class="subtask-progress-fill" :style="{ width: subtaskPct(task) + '%' }"></div>
                </div>
              </div>

              <!-- Expanded inline task list -->
              <div v-if="expandedTaskIds.includes(task.id)" class="subtask-list">
                <div
                  v-for="sub in task.subtasks"
                  :key="sub.id"
                  :class="['subtask-row', { 'subtask-row--done': sub.status === 'done', 'subtask-row--inprogress': sub.status === 'in-progress', 'subtask-row--active': isSubtaskActive(sub.id) }]"
                  @click.stop="openEditTaskDialog(task, sub)"
                >
                  <div class="subtask-row-main">
                    <!-- Square checkbox -->
                    <button
                      class="subtask-status-btn"
                      type="button"
                      :title="sub.status === 'done' ? 'Mark undone' : 'Mark done'"
                      @click.stop.prevent="toggleSubtask(task, sub.id)"
                    >
                      <!-- done: filled square + checkmark -->
                      <svg v-if="sub.status === 'done'" width="13" height="13" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="3" fill="var(--success)"/><path d="M7 12l3.5 3.5L17 8" stroke="white" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
                      <!-- in-progress: soft square + dash -->
                      <svg v-else-if="sub.status === 'in-progress'" width="13" height="13" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="3" stroke="var(--accent)" stroke-width="2" fill="var(--accent-soft)"/><line x1="8" y1="12" x2="16" y2="12" stroke="var(--accent)" stroke-width="2.5" stroke-linecap="round"/></svg>
                      <!-- todo: empty square -->
                      <svg v-else width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--border)" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="3"/></svg>
                    </button>
                    <div class="subtask-row-content">
                      <span class="subtask-title">{{ sub.title }}</span>
                      <div class="subtask-row-meta">
                        <span v-if="sub.estimatedHours" class="subtask-est">{{ sub.estimatedHours }}h</span>
                        <span v-if="isSubtaskActive(sub.id)" class="subtask-elapsed">{{ elapsedFor(sub.id) }}</span>
                        <button
                          :class="['subtask-timer-btn', { 'subtask-timer-btn--active': isSubtaskActive(sub.id) }]"
                          type="button"
                          :title="isSubtaskActive(sub.id) ? 'Stop timer' : 'Start timer'"
                          @click.stop.prevent="toggleSubtaskTimer(task, sub)"
                        >
                          <svg v-if="!isSubtaskActive(sub.id)" xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                          <svg v-else xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h12v12H6z"/></svg>
                        </button>
                        <button class="subtask-remove" type="button" @click.stop.prevent="removeSubtask(task, sub.id)">×</button>
                      </div>
                      <!-- Per-task time progress bar (only when estimate set) -->
                      <div v-if="sub.estimatedHours" class="subtask-row-bar">
                        <div
                          class="subtask-row-bar-fill"
                          :class="{ 'subtask-row-bar-fill--over': subtaskProgressPct(sub) >= 100 }"
                          :style="{ width: Math.max(subtaskProgressPct(sub), subtaskLoggedMins(sub.id) > 0 ? 4 : 0) + '%' }"
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
                <button class="subtask-add-task-btn" type="button" @click.stop="openAddTaskDialog(task)">+ Add task</button>
              </div>

              <div class="task-actions">
                <div v-if="isFeatureTracking(task)" class="task-tracking-badge task-tracking-badge--pulse">
                  <!-- Pulsing clock icon — multiple tasks may be running -->
                  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                </div>
                <!-- Always allow adding subtasks, even when none exist yet -->
                <button
                  v-if="!(task.subtasks?.length)"
                  class="subtask-add-task-btn"
                  style="margin-right: auto;"
                  type="button"
                  @click.stop="openAddTaskDialog(task)"
                >+ Add task</button>
                <button class="icon-btn" type="button" title="Edit" @click="openEditDialog(task)">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
                <button class="icon-btn icon-btn--danger" type="button" title="Delete" @click="deleteTask(task.id)">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                </button>
              </div>
            </article>
          </div>
          <button class="column-add-btn" type="button" @click="openTaskDialogForStatus(status.key)">+ Add feature</button>
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
        <h3>{{ isEditing ? 'Edit feature' : 'Create new feature' }}</h3>
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

        <div class="field">
          <button class="button" @click="submitTask">{{ isEditing ? 'Update feature' : 'Save feature' }}</button>
          <button class="button button-secondary" @click="closeDialog" type="button">Cancel</button>
        </div>
      </div>
    </div>

    <!-- Task dialog (add / edit a child task with estimate) -->
    <div v-if="showTaskDialog" class="modal-backdrop" @click.self="closeTaskDialog">
      <div class="modal">
        <h3>{{ taskDialogSubtaskId ? 'Edit task' : 'Add task' }}</h3>
        <div class="field">
          <label for="taskTitle">Title</label>
          <input id="taskTitle" v-model="taskForm.title" placeholder="Task name" />
        </div>
        <div class="form-row">
          <div class="field">
            <label for="taskAssignee">Assignee</label>
            <select id="taskAssignee" v-model="taskForm.assigneeId">
              <option value="">Unassigned</option>
              <option v-for="member in members" :key="member.id" :value="member.id">{{ member.name }}</option>
            </select>
          </div>
          <div class="field">
            <label for="taskEst">Estimated hours</label>
            <input id="taskEst" type="number" min="0.5" step="0.5" v-model.number="taskForm.estimatedHours" placeholder="e.g. 2" />
          </div>
        </div>
        <div class="field">
          <button class="button" @click="submitTaskDialog">{{ taskDialogSubtaskId ? 'Update task' : 'Add task' }}</button>
          <button class="button button-secondary" type="button" @click="closeTaskDialog">Cancel</button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { usePocStore, type Task, type TaskStatus, type TaskPriority, type Subtask, type SubtaskStatus, type Member } from '@/composables/usePocStore'
import { useRoute, useRouter } from 'vue-router'

const store = usePocStore()
const route = useRoute()
const router = useRouter()
const tasks = store.filteredTasks
const members = store.members
const projects = store.projects
const selectedProjectId = store.selectedProjectId
const timeEntries = store.timeEntries
const activeTimers = store.activeTimers

// Members shown in assignee filter: project members when filtered, all otherwise
const displayMembers = computed(() => store.projectMembers.value)

// Sync URL query param with selectedProjectId
watch(() => route.query.project, (val) => {
  if (val && typeof val === 'string') {
    selectedProjectId.value = val
  }
}, { immediate: true })

watch(selectedProjectId, (val) => {
  const current = route.query.project as string | undefined
  if (val && val !== current) {
    router.replace({ query: { ...route.query, project: val } })
  } else if (!val && current) {
    const { project, ...rest } = route.query
    router.replace({ query: rest })
  }
})
const showDialog = ref(false)
const draggedTaskId = ref<string | null>(null)
const editingTaskId = ref<string | null>(null)
const dragEnterCounts = reactive<Record<string, number>>({})
const now = ref(Date.now())
let clockInterval: ReturnType<typeof setInterval> | null = null
const isEditing = computed(() => !!editingTaskId.value)

// Subtask state
const expandedTaskIds = ref<string[]>([])
const formSubtasks = ref<Subtask[]>([])
const inlineInputs = reactive<Record<string, string>>({})

// Task (subtask) dialog
const showTaskDialog = ref(false)
const taskDialogFeatureId = ref<string | null>(null)
const taskDialogSubtaskId = ref<string | null>(null)
const taskForm = reactive({
  title: '',
  assigneeId: '',
  estimatedHours: undefined as number | undefined,
})

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
  status: 'todo' as TaskStatus,
  dueDate: '',
})

// ─── Subtask helpers ────────────────────────────────────────────────────────
const subtaskDoneCount = (task: Task) => (task.subtasks ?? []).filter((s) => s.status === 'done').length
const subtaskPct = (task: Task) => {
  const subs = task.subtasks ?? []
  if (!subs.length) return 0
  return Math.round((subs.filter((s) => s.status === 'done').length / subs.length) * 100)
}

const featureTotalEstimate = (task: Task): string | null => {
  const total = (task.subtasks ?? []).reduce((sum, s) => sum + (s.estimatedHours ?? 0), 0)
  return total > 0 ? `${total}h` : null
}

const subtaskLoggedMins = (subtaskId: string): number =>
  timeEntries.value
    .filter((e) => e.subtaskId === subtaskId)
    .reduce((sum, e) => sum + e.durationMinutes, 0)

const subtaskProgressPct = (sub: Subtask): number => {
  if (!sub.estimatedHours) return 0
  return Math.min(100, Math.round((subtaskLoggedMins(sub.id) / (sub.estimatedHours * 60)) * 100))
}

const toggleExpand = (taskId: string) => {
  if (expandedTaskIds.value.includes(taskId)) {
    expandedTaskIds.value = expandedTaskIds.value.filter((id) => id !== taskId)
  } else {
    expandedTaskIds.value = [...expandedTaskIds.value, taskId]
  }
}

const toggleSubtask = async (task: Task, subtaskId: string) => {
  const subtasks = (task.subtasks ?? []).map((s) =>
    s.id === subtaskId ? { ...s, status: (s.status === 'done' ? 'todo' : 'done') as SubtaskStatus } : s,
  )
  await store.updateTask({ ...task, subtasks })
}

const removeSubtask = async (task: Task, subtaskId: string) => {
  const subtasks = (task.subtasks ?? []).filter((s) => s.id !== subtaskId)
  await store.updateTask({ ...task, subtasks })
}

const featureAssignees = (task: Task): Member[] => {
  const ids = [...new Set((task.subtasks ?? []).map((s) => s.assigneeId).filter(Boolean))] as string[]
  return ids.map((id) => members.value.find((m) => m.id === id)).filter(Boolean) as Member[]
}

// ─── Task dialog (add/edit child tasks with estimates) ───────────────────────
const openAddTaskDialog = (feature: Task) => {
  taskDialogFeatureId.value = feature.id
  taskDialogSubtaskId.value = null
  taskForm.title = ''
  taskForm.assigneeId = ''
  taskForm.estimatedHours = undefined
  showTaskDialog.value = true
}

const openEditTaskDialog = (feature: Task, sub: Subtask) => {
  taskDialogFeatureId.value = feature.id
  taskDialogSubtaskId.value = sub.id
  taskForm.title = sub.title
  taskForm.assigneeId = sub.assigneeId ?? ''
  taskForm.estimatedHours = sub.estimatedHours
  showTaskDialog.value = true
}

const closeTaskDialog = () => {
  showTaskDialog.value = false
  taskDialogFeatureId.value = null
  taskDialogSubtaskId.value = null
  taskForm.title = ''
  taskForm.assigneeId = ''
  taskForm.estimatedHours = undefined
}

const submitTaskDialog = async () => {
  if (!taskForm.title.trim() || !taskDialogFeatureId.value) return
  const feature = tasks.value.find((t) => t.id === taskDialogFeatureId.value)
  if (!feature) return

  if (taskDialogSubtaskId.value) {
    const subtasks = (feature.subtasks ?? []).map((s) =>
      s.id === taskDialogSubtaskId.value
        ? { ...s, title: taskForm.title, assigneeId: taskForm.assigneeId || undefined, estimatedHours: taskForm.estimatedHours || undefined }
        : s,
    )
    await store.updateTask({ ...feature, subtasks })
  } else {
    const newSub: Subtask = {
      id: crypto.randomUUID(),
      title: taskForm.title,
      status: 'todo' as SubtaskStatus,
      assigneeId: taskForm.assigneeId || undefined,
      estimatedHours: taskForm.estimatedHours || undefined,
    }
    const subtasks = [...(feature.subtasks ?? []), newSub]
    await store.updateTask({ ...feature, subtasks })
    if (!expandedTaskIds.value.includes(feature.id)) {
      expandedTaskIds.value = [...expandedTaskIds.value, feature.id]
    }
  }
  closeTaskDialog()
}

const filters = reactive({
  query: '',
  assigneeId: '',
})

const filteredTasks = computed(() => {
  const query = filters.query.trim().toLowerCase()
  return tasks.value.filter((task) => {
    if (filters.assigneeId) {
      const hasAssignee = (task.subtasks ?? []).some((s) => s.assigneeId === filters.assigneeId)
      if (!hasAssignee) return false
    }

    if (!query) {
      return true
    }

    const assignee = memberName(task.assigneeId ?? '').toLowerCase()
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

// ─── Subtask timer helpers ─────────────────────────────────────────────────
const isSubtaskActive = (subtaskId: string) =>
  activeTimers.value.some((t) => t.subtaskId === subtaskId)

const isFeatureTracking = (task: Task) =>
  activeTimers.value.some((t) => t.taskId === task.id)

const elapsedFor = (subtaskId: string): string => {
  const timer = activeTimers.value.find((t) => t.subtaskId === subtaskId)
  if (!timer?.startedAt) return '0:00:00'
  const diff = Math.max(0, now.value - new Date(timer.startedAt).getTime())
  const totalSeconds = Math.floor(diff / 1000)
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

const toggleSubtaskTimer = async (task: Task, sub: Subtask) => {
  if (isSubtaskActive(sub.id)) {
    await store.stopTimer(sub.id)
    return
  }
  await store.startTimer(task, sub)
}

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

// Keep for summary panel (uses first active timer)
const elapsedDisplay = computed(() => {
  const timer = activeTimers.value[0]
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
  form.status = task.status
  form.dueDate = task.dueDate
  formSubtasks.value = [...(task.subtasks ?? [])]
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
  form.status = 'todo'
  form.dueDate = new Date().toISOString().slice(0, 10)
  formSubtasks.value = []
}

const submitTask = async () => {
  if (!form.title.trim()) return
  const payload: any = {
    title: form.title,
    description: form.description,
    status: form.status,
    priority: form.priority,
    dueDate: form.dueDate || new Date().toISOString().slice(0, 10),
    subtasks: formSubtasks.value.length ? [...formSubtasks.value] : undefined,
  }

  if (selectedProjectId.value) {
    payload.projectId = selectedProjectId.value
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

const openTaskDialogForStatus = (statusKey: string) => {
  editingTaskId.value = null
  resetForm()
  form.status = statusKey as TaskStatus
  showDialog.value = true
}

onMounted(async () => {
  await store.loadAll()
  clockInterval = setInterval(() => { now.value = Date.now() }, 1000)
})

onUnmounted(() => {
  if (clockInterval) clearInterval(clockInterval)
})
</script>

<style scoped>
.project-select {
  font-weight: 500;
  min-width: 200px;
}
</style>
