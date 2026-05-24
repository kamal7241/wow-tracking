<template>
  <section>
    <div class="page-header">
      <div>
        <h2 class="page-title">Kanban board</h2>
        <p class="page-subtitle">Manage tasks, assign team members, and start the timer directly from each card.</p>
      </div>
      <button class="button" @click="openTaskDialog">Add task</button>
    </div>

    <div class="panel">
      <div class="grid-cols-4">
        <section
          v-for="status in statuses"
          :key="status.key"
          class="column-card"
          @dragover.prevent
          @drop="() => onDrop(status.key)"
        >
          <div class="column-header">
            <h3 class="column-title">{{ status.label }}</h3>
            <span class="column-meta">{{ tasksByStatus(status.key).length }}</span>
          </div>

          <div class="column-meta">Drop cards here to move their status.</div>

          <div class="column-content" style="display:grid;gap:12px;">
            <article
              v-for="task in tasksByStatus(status.key)"
              :key="task.id"
              class="task-card"
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
                <span class="assignee">Assigned to {{ memberName(task.assigneeId) }}</span>
              </div>

              <button class="tracker-button" @click="startTaskTimer(task)">
                {{ activeTask?.id === task.id ? 'Running' : 'Start timer' }}
              </button>
            </article>
          </div>
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
          <p class="summary-value">{{ store.tasks.length }}</p>
        </div>
        <div class="summary-card">
          <p class="summary-title">Active timer</p>
          <p class="summary-value">{{ store.activeTimer ? 'Running' : 'None' }}</p>
        </div>
        <div class="summary-card">
          <p class="summary-title">Team members</p>
          <p class="summary-value">{{ store.members.length }}</p>
        </div>
      </div>
    </div>

    <div v-if="showDialog" class="modal-backdrop" @click.self="closeDialog">
      <div class="modal">
        <h3>Create new task</h3>
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
              <option v-for="member in store.members" :key="member.id" :value="member.id">{{ member.name }}</option>
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
        <div class="field">
          <button class="button" @click="submitTask">Save task</button>
          <button class="button button-secondary" @click="closeDialog" type="button">Cancel</button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watchEffect } from 'vue'
import { usePocStore, type Task, type TaskStatus, type TaskPriority } from '@/composables/usePocStore'

const store = usePocStore()
const showDialog = ref(false)
const draggedTaskId = ref<string | null>(null)

const statuses = [
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
})

const tasksByStatus = (status: TaskStatus) => {
  return store.tasks.filter((task) => task.status === status)
}

const activeTask = computed(() => {
  return store.activeTask
})

const memberName = (memberId: string) => {
  return store.members.find((member) => member.id === memberId)?.name ?? 'Unassigned'
}

const openTaskDialog = () => {
  showDialog.value = true
}

const closeDialog = () => {
  showDialog.value = false
}

const resetForm = () => {
  form.title = ''
  form.description = ''
  form.priority = 'medium'
  form.assigneeId = store.members[0]?.id ?? ''
  form.status = 'todo'
  form.dueDate = ''
}

const submitTask = async () => {
  if (!form.title.trim() || !form.assigneeId) return
  await store.createTask({
    title: form.title,
    description: form.description,
    status: form.status,
    priority: form.priority,
    assigneeId: form.assigneeId,
    dueDate: form.dueDate || new Date().toISOString().slice(0, 10),
  })
  resetForm()
  closeDialog()
}

const onDragStart = (task: Task) => {
  draggedTaskId.value = task.id
}

const onDrop = async (status: TaskStatus) => {
  if (!draggedTaskId.value) return
  const task = store.tasks.find((item) => item.id === draggedTaskId.value)
  if (!task) return
  if (task.status !== status) {
    await store.updateTask({ ...task, status })
  }
  draggedTaskId.value = null
}

const startTaskTimer = async (task: Task) => {
  await store.startTimer(task)
}

onMounted(async () => {
  await store.loadAll()
  if (!form.assigneeId && store.members.length) {
    form.assigneeId = store.members[0].id
  }
})

watchEffect(() => {
  if (!form.assigneeId && store.members.length) {
    form.assigneeId = store.members[0].id
  }
})
</script>
