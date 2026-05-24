<template>
  <section>
    <div class="page-header">
      <div>
        <h2 class="page-title">Time tracking</h2>
        <p class="page-subtitle">Stop active timers, log manual time, and review team timesheets.</p>
      </div>
    </div>

    <div class="panel">
      <div class="summary-grid">
        <div class="summary-card">
          <p class="summary-title">Today</p>
          <p class="summary-value">{{ formatMinutes(todayMinutes) }}</p>
        </div>
        <div class="summary-card">
          <p class="summary-title">This week</p>
          <p class="summary-value">{{ formatMinutes(weekMinutes) }}</p>
        </div>
        <div class="summary-card">
          <p class="summary-title">Active timer</p>
          <p class="summary-value">{{ store.activeTimer ? formatMinutes(store.activeDurationMinutes) : 'None' }}</p>
        </div>
      </div>

      <div class="panel" style="margin-top:0;padding:20px;">
        <div class="page-header">
          <div>
            <h3 class="page-title">Active timer</h3>
            <p class="page-subtitle">Track task time while you work.</p>
          </div>
          <button class="button button-secondary" @click="handleStopTimer" v-if="store.activeTimer">Stop timer</button>
        </div>

        <div v-if="store.activeTimer" class="task-card">
          <div class="task-title-row">
            <h4 class="task-title">{{ store.activeTimer.taskTitle }}</h4>
            <span class="badge medium">Tracking</span>
          </div>
          <div class="task-meta">
            <span>{{ activeTaskName }}</span>
            <span>{{ formatMinutes(store.activeDurationMinutes) }}</span>
          </div>
        </div>

        <div v-else class="task-card">
          <p class="task-meta">No active timer. Start one from the Kanban board.</p>
        </div>
      </div>

      <div class="panel" style="margin-top:24px;">
        <div class="page-header">
          <div>
            <h3 class="page-title">Manual entry</h3>
            <p class="page-subtitle">Add hours for work that was tracked outside the timer.</p>
          </div>
          <button class="button" @click="submitManualEntry">Add entry</button>
        </div>

        <div class="form-row">
          <div class="field">
            <label for="task">Task</label>
            <select id="task" v-model="manual.taskId">
              <option v-for="task in store.tasks" :key="task.id" :value="task.id">{{ task.title }}</option>
            </select>
          </div>
          <div class="field">
            <label for="duration">Duration (minutes)</label>
            <input id="duration" type="number" min="5" step="5" v-model.number="manual.durationMinutes" />
          </div>
        </div>
        <div class="form-row">
          <div class="field">
            <label for="date">Date</label>
            <input id="date" type="date" v-model="manual.date" />
          </div>
          <div class="field">
            <label for="billable">Billable</label>
            <select id="billable" v-model="manual.billable">
              <option :value="true">Yes</option>
              <option :value="false">No</option>
            </select>
          </div>
        </div>
        <div class="field">
          <label for="notes">Notes</label>
          <textarea id="notes" v-model="manual.notes" placeholder="Optional details"></textarea>
        </div>
      </div>

      <div class="panel" style="margin-top:24px;">
        <div class="page-header">
          <div>
            <h3 class="page-title">Timesheet log</h3>
            <p class="page-subtitle">Recent entries created from the timer or manual form.</p>
          </div>
        </div>

        <div class="table-wrapper">
          <table class="table">
            <thead>
              <tr>
                <th>Task</th>
                <th>Member</th>
                <th>Duration</th>
                <th>Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="entry in sortedEntries" :key="entry.id">
                <td>{{ entry.taskTitle }}</td>
                <td>{{ memberName(entry.memberId) }}</td>
                <td>{{ formatMinutes(entry.durationMinutes) }}</td>
                <td>{{ formatDate(entry.startedAt) }}</td>
                <td><span class="status-chip">{{ entry.billable ? 'Billable' : 'Non-billable' }}</span></td>
              </tr>
              <tr v-if="sortedEntries.length === 0">
                <td colspan="5" style="padding: 22px 16px; color: var(--muted);">No time entries yet.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, watchEffect } from 'vue'
import { usePocStore } from '@/composables/usePocStore'

const store = usePocStore()

const manual = reactive({
  taskId: '',
  durationMinutes: 30,
  date: new Date().toISOString().slice(0, 10),
  notes: '',
  billable: true,
})

const formatMinutes = (minutes: number) => {
  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  if (hours > 0) {
    return `${hours}h ${remainder}m`
  }
  return `${remainder}m`
}

const formatDate = (iso: string) => {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(iso))
}

const sameDay = (a: Date, b: Date) => {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

const todayMinutes = computed(() => {
  const today = new Date()
  return store.timeEntries.reduce((total, entry) => {
    return sameDay(new Date(entry.startedAt), today) ? total + entry.durationMinutes : total
  }, 0)
})

const weekMinutes = computed(() => {
  const now = new Date()
  const weekAgo = new Date(now)
  weekAgo.setDate(now.getDate() - 7)
  return store.timeEntries.reduce((total, entry) => {
    const date = new Date(entry.startedAt)
    return date >= weekAgo ? total + entry.durationMinutes : total
  }, 0)
})

const activeTaskName = computed(() => store.activeTask?.title ?? 'No active task')

const handleStopTimer = async () => {
  await store.stopTimer()
}

const submitManualEntry = async () => {
  if (!manual.taskId || manual.durationMinutes < 5) return
  const task = store.tasks.find((item) => item.id === manual.taskId)
  if (!task) return

  const started = new Date(`${manual.date}T09:00:00.000Z`)
  const stopped = new Date(started.getTime() + manual.durationMinutes * 60000)

  await store.createTimeEntry({
    taskId: task.id,
    taskTitle: task.title,
    memberId: task.assigneeId,
    startedAt: started.toISOString(),
    stoppedAt: stopped.toISOString(),
    durationMinutes: manual.durationMinutes,
    notes: manual.notes,
    billable: manual.billable,
  })

  manual.notes = ''
  manual.durationMinutes = 30
}

const memberName = (memberId: string) => {
  return store.members.find((member) => member.id === memberId)?.name ?? 'Unknown'
}

const sortedEntries = computed(() => {
  return [...store.timeEntries].sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
})

onMounted(async () => {
  await store.loadAll()
  if (!manual.taskId && store.tasks.length) {
    manual.taskId = store.tasks[0].id
  }
})

watchEffect(() => {
  if (!manual.taskId && store.tasks.length) {
    manual.taskId = store.tasks[0].id
  }
})
</script>
