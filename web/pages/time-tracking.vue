<template>
  <section class="tt-page">

    <!-- ── Day header ── -->
    <div class="tt-day-hero">
      <div class="tt-day-hero-left">
        <p class="tt-day-label">{{ todayLabel }}</p>
        <h2 class="tt-day-title">Today's tracking</h2>
      </div>
      <div class="tt-day-stats">
        <div class="tt-stat">
          <span class="tt-stat-value">{{ formatMinutes(todayMinutes) }}</span>
          <span class="tt-stat-label">Logged today</span>
        </div>
        <div class="tt-stat-divider"></div>
        <div class="tt-stat" :class="{ 'tt-stat--ok': remainingMinutes <= 0 }">
          <span class="tt-stat-value">{{ remainingMinutes > 0 ? formatMinutes(remainingMinutes) : 'Done ✓' }}</span>
          <span class="tt-stat-label">Remaining ({{ targetHours }}h day)</span>
        </div>
        <div class="tt-stat-divider"></div>
        <div class="tt-stat" :class="{ 'tt-stat--running': activeTimers.length > 0 }">
          <span class="tt-stat-value">{{ activeTimers.length }}</span>
          <span class="tt-stat-label">{{ activeTimers.length === 1 ? 'Timer running' : 'Timers running' }}</span>
        </div>
      </div>
    </div>

    <!-- Workday progress bar -->
    <div class="tt-progress-wrap">
      <div class="tt-progress-track">
        <div class="tt-progress-fill" :style="{ width: dayProgressPct + '%' }"></div>
        <!-- Active timer live extension -->
        <div
          v-if="activeTimers.length"
          class="tt-progress-live"
          :style="{ left: dayProgressPct + '%', width: liveProgressPct + '%' }"
        ></div>
      </div>
      <div class="tt-progress-markers">
        <span>0h</span>
        <span>{{ Math.round(targetHours / 2) }}h</span>
        <span>{{ targetHours }}h</span>
      </div>
    </div>

    <!-- ── Active timers ── -->
    <div v-if="activeTimers.length" class="tt-active-section">
      <div class="tt-active-header">
        <div class="tt-active-title-row">
          <span class="tt-active-dot"></span>
          <span class="tt-section-title">Running now</span>
        </div>
        <button class="button button-secondary" type="button" @click="stopAll">Stop all</button>
      </div>
      <div class="tt-active-cards">
        <div v-for="timer in activeTimers" :key="timer.id" class="tt-active-card">
          <div class="tt-active-card-left">
            <span class="tt-active-feature">{{ timer.taskTitle }}</span>
            <span v-if="timer.subtaskTitle" class="tt-active-subtask">
              <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
              {{ timer.subtaskTitle }}
            </span>
          </div>
          <div class="tt-active-card-right">
            <span class="tt-active-elapsed">{{ elapsedForTimer(timer) }}</span>
            <button
              class="tt-stop-btn"
              type="button"
              @click="store.stopTimer(timer.subtaskId)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>
              Stop
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Main columns ── -->
    <div class="tt-main-cols">

      <!-- Left: task picker -->
      <div class="tt-col-picker">
        <div class="panel">
          <div class="tt-picker-header">
            <div>
              <h3 class="page-title">Start tracking</h3>
              <p class="page-subtitle">Pick a subtask to start or stop a timer.</p>
            </div>
            <div class="tt-search-wrap">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input v-model="taskSearch" class="tt-search-input" placeholder="Filter tasks…" />
            </div>
          </div>

          <div v-if="trackableTasks.length === 0" class="tt-empty">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            <p>No open tasks to track</p>
          </div>

          <div v-for="feature in trackableTasks" :key="feature.id" class="tt-feature">
            <div class="tt-feature-header">
              <div class="tt-feature-title-row">
                <span class="tt-feature-name">{{ feature.title }}</span>
                <span :class="['badge', feature.priority]">{{ priorityLabels[feature.priority] }}</span>
              </div>
              <span :class="['tt-feature-status', 'tt-feature-status--' + feature.status]">{{ statusLabels[feature.status] }}</span>
            </div>

            <!-- No subtasks: quick-start on the feature itself -->
            <div v-if="!feature.subtasks?.length" class="tt-no-subtasks">
              <span class="tt-muted">No subtasks — </span>
              <button class="tt-link-btn" @click="startFeatureTimer(feature)">
                {{ isFeatureRunning(feature.id) ? 'stop timer' : 'start timer' }}
              </button>
            </div>

            <div v-else class="tt-subtask-rows">
              <button
                v-for="sub in sortedSubtasks(feature)"
                :key="sub.id"
                :class="['tt-subtask-row', {
                  'tt-subtask-row--active': isTimerRunning(sub.id),
                  'tt-subtask-row--done': sub.status === 'done',
                }]"
                type="button"
                :disabled="sub.status === 'done'"
                @click="toggleTimer(feature, sub)"
              >
                <!-- Status icon -->
                <span class="tt-sub-icon">
                  <svg v-if="sub.status === 'done'" width="13" height="13" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="3" fill="var(--success)"/><path d="M7 12l3.5 3.5L17 8" stroke="white" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
                  <svg v-else-if="sub.status === 'in-progress'" width="13" height="13" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="3" stroke="var(--accent)" stroke-width="2" fill="var(--accent-soft)"/><line x1="8" y1="12" x2="16" y2="12" stroke="var(--accent)" stroke-width="2.5" stroke-linecap="round"/></svg>
                  <svg v-else width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--border)" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="3"/></svg>
                </span>

                <div class="tt-sub-info">
                  <span class="tt-sub-title">{{ sub.title }}</span>
                  <div class="tt-sub-meta">
                    <span v-if="sub.assigneeId" class="tt-sub-assignee">{{ memberName(sub.assigneeId) }}</span>
                    <span v-if="sub.estimatedHours" class="tt-sub-est">{{ sub.estimatedHours }}h est</span>
                    <span v-if="isTimerRunning(sub.id)" class="tt-sub-running-badge">running</span>
                  </div>
                </div>

                <div class="tt-sub-right">
                  <span v-if="isTimerRunning(sub.id)" class="tt-sub-elapsed">{{ elapsedForSubtask(sub.id) }}</span>
                  <span class="tt-play-icon" :class="{ 'tt-play-icon--stop': isTimerRunning(sub.id) }">
                    <svg v-if="!isTimerRunning(sub.id)" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                    <svg v-else xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>
                  </span>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Right: today's log + manual entry -->
      <div class="tt-col-log">

        <!-- Today's log -->
        <div class="panel">
          <div class="tt-log-header">
            <h3 class="page-title">Today's log</h3>
            <span class="tt-log-total">{{ formatMinutes(todayMinutes) }}</span>
          </div>
          <div v-if="todayEntries.length === 0" class="tt-empty tt-empty--sm">
            <p>Nothing logged today yet.</p>
          </div>
          <div v-else class="tt-log-list">
            <div v-for="entry in todayEntries" :key="entry.id" class="tt-log-entry">
              <div class="tt-log-entry-left">
                <span class="tt-log-task">{{ entry.taskTitle }}</span>
                <span v-if="entry.subtaskTitle" class="tt-log-subtask">{{ entry.subtaskTitle }}</span>
                <span class="tt-log-member">{{ memberName(entry.memberId) }}</span>
              </div>
              <div class="tt-log-entry-right">
                <span class="tt-log-dur">{{ formatMinutes(entry.durationMinutes) }}</span>
                <span :class="['tt-log-billable', entry.billable ? 'tt-log-billable--yes' : 'tt-log-billable--no']">{{ entry.billable ? '₿' : 'NB' }}</span>
                <button class="icon-btn icon-btn--danger" type="button" title="Delete" @click="deleteEntry(entry.id)">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Manual entry -->
        <div class="panel">
          <h3 class="page-title" style="margin-bottom:14px;">Manual entry</h3>
          <div class="field">
            <label>Task</label>
            <select v-model="manual.taskId">
              <option v-for="task in tasks" :key="task.id" :value="task.id">{{ task.title }}</option>
            </select>
          </div>
          <div class="form-row">
            <div class="field">
              <label>Duration (min)</label>
              <input type="number" min="5" step="5" v-model.number="manual.durationMinutes" />
            </div>
            <div class="field">
              <label>Date</label>
              <input type="date" v-model="manual.date" />
            </div>
          </div>
          <div class="form-row">
            <div class="field">
              <label>Billable</label>
              <select v-model="manual.billable">
                <option :value="true">Yes</option>
                <option :value="false">No</option>
              </select>
            </div>
            <div class="field">
              <label>Notes</label>
              <input v-model="manual.notes" placeholder="Optional" />
            </div>
          </div>
          <button class="button" style="width:100%;" @click="submitManualEntry">Add entry</button>
        </div>
      </div>
    </div>

    <!-- ── Full timesheet ── -->
    <div class="panel" style="margin-top:0;">
      <div class="tt-sheet-header">
        <div>
          <h3 class="page-title">All time entries</h3>
          <p class="page-subtitle">{{ formatMinutes(weekMinutes) }} this week</p>
        </div>
        <div class="field" style="margin:0;min-width:180px;">
          <label style="font-size:0.8rem;">Filter by member</label>
          <select v-model="memberFilter">
            <option value="">All members</option>
            <option v-for="member in members" :key="member.id" :value="member.id">{{ member.name }}</option>
          </select>
        </div>
      </div>
      <div class="table-wrapper">
        <table class="table">
          <thead>
            <tr>
              <th>Task / Subtask</th>
              <th>Member</th>
              <th>Duration</th>
              <th>Date</th>
              <th>Type</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="entry in filteredEntries" :key="entry.id">
              <td>
                <span>{{ entry.taskTitle }}</span>
                <span v-if="entry.subtaskTitle" style="display:block;font-size:0.8rem;color:var(--muted);">{{ entry.subtaskTitle }}</span>
              </td>
              <td>{{ memberName(entry.memberId) }}</td>
              <td>{{ formatMinutes(entry.durationMinutes) }}</td>
              <td>{{ formatDate(entry.startedAt) }}</td>
              <td><span class="status-chip">{{ entry.billable ? 'Billable' : 'Non-billable' }}</span></td>
              <td>
                <button class="icon-btn icon-btn--danger" type="button" @click="deleteEntry(entry.id)">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                </button>
              </td>
            </tr>
            <tr v-if="filteredEntries.length === 0">
              <td colspan="6" style="padding:22px 16px;color:var(--muted);">No time entries yet.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, watchEffect } from 'vue'
import { usePocStore } from '@/composables/usePocStore'
import type { Task, Subtask, TimeEntry } from '@/composables/usePocStore'

const store = usePocStore()
const tasks = store.tasks
const members = store.members
const activeTimers = store.activeTimers
const memberFilter = ref('')
const taskSearch = ref('')
const now = ref(Date.now())
let clockInterval: ReturnType<typeof setInterval> | null = null

const TARGET_HOURS = 8
const targetHours = TARGET_HOURS

const manual = reactive({
  taskId: '',
  durationMinutes: 30,
  date: new Date().toISOString().slice(0, 10),
  notes: '',
  billable: true,
})

// ─── Formatting helpers ──────────────────────────────────────────────────────
const formatMinutes = (minutes: number) => {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

const formatDate = (iso: string) =>
  new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso))

const todayLabel = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date())

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()

// ─── Day stats ───────────────────────────────────────────────────────────────
const todayMinutes = computed(() => {
  const today = new Date()
  return store.timeEntries.value.reduce((total, entry) =>
    sameDay(new Date(entry.startedAt), today) ? total + entry.durationMinutes : total, 0)
})

const weekMinutes = computed(() => {
  const weekStart = new Date()
  weekStart.setDate(weekStart.getDate() - 7)
  return store.timeEntries.value.reduce((total, entry) =>
    new Date(entry.startedAt) >= weekStart ? total + entry.durationMinutes : total, 0)
})

// Live elapsed minutes from all active timers
const liveElapsedMinutes = computed(() =>
  activeTimers.value.reduce((sum, t) => {
    if (!t.startedAt) return sum
    return sum + (now.value - new Date(t.startedAt).getTime()) / 60000
  }, 0)
)

const totalMinutesWithLive = computed(() => todayMinutes.value + liveElapsedMinutes.value)

const remainingMinutes = computed(() =>
  Math.max(0, TARGET_HOURS * 60 - totalMinutesWithLive.value)
)

const dayProgressPct = computed(() =>
  Math.min(100, Math.round((todayMinutes.value / (TARGET_HOURS * 60)) * 100))
)

const liveProgressPct = computed(() =>
  Math.min(100 - dayProgressPct.value, (liveElapsedMinutes.value / (TARGET_HOURS * 60)) * 100)
)

// ─── Timer helpers ────────────────────────────────────────────────────────────
const elapsedForTimer = (timer: TimeEntry): string => {
  if (!timer.startedAt) return '0:00:00'
  const diff = Math.max(0, now.value - new Date(timer.startedAt).getTime())
  const s = Math.floor(diff / 1000)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

const elapsedForSubtask = (subtaskId: string): string => {
  const timer = activeTimers.value.find((t) => t.subtaskId === subtaskId)
  return timer ? elapsedForTimer(timer) : '0:00:00'
}

const isTimerRunning = (subtaskId: string) =>
  activeTimers.value.some((t) => t.subtaskId === subtaskId)

const isFeatureRunning = (taskId: string) =>
  activeTimers.value.some((t) => t.taskId === taskId)

const stopAll = async () => store.stopTimer()

const startFeatureTimer = async (feature: Task) => {
  if (isFeatureRunning(feature.id)) {
    // Stop the feature-level timer (subtaskId undefined)
    const timer = activeTimers.value.find((t) => t.taskId === feature.id)
    if (timer) await store.stopTimer(timer.subtaskId)
  } else {
    await store.startTimer(feature)
  }
}

const toggleTimer = async (feature: Task, sub: Subtask) => {
  if (isTimerRunning(sub.id)) {
    await store.stopTimer(sub.id)
  } else {
    await store.startTimer(feature, sub)
  }
}

// ─── Task picker data ─────────────────────────────────────────────────────────
const statusLabels: Record<string, string> = {
  'todo': 'To Do', 'in-progress': 'In Progress', 'in-review': 'In Review', 'done': 'Done',
}

const priorityLabels: Record<string, string> = {
  low: 'Low', medium: 'Medium', high: 'High', critical: 'Critical',
}

const priorityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 }
const statusOrder: Record<string, number> = { 'in-progress': 0, 'in-review': 1, 'todo': 2, 'done': 99 }

const trackableTasks = computed(() => {
  const q = taskSearch.value.trim().toLowerCase()
  return tasks.value
    .filter((t) => t.status !== 'done')
    .filter((t) => !q || t.title.toLowerCase().includes(q) ||
      (t.subtasks ?? []).some((s) => s.title.toLowerCase().includes(q)))
    .sort((a, b) => {
      const sOrd = (statusOrder[a.status] ?? 99) - (statusOrder[b.status] ?? 99)
      if (sOrd !== 0) return sOrd
      return (priorityOrder[a.priority] ?? 99) - (priorityOrder[b.priority] ?? 99)
    })
})

const sortedSubtasks = (feature: Task) => {
  return [...(feature.subtasks ?? [])].sort((a, b) => {
    // running timers first
    if (isTimerRunning(a.id) && !isTimerRunning(b.id)) return -1
    if (!isTimerRunning(a.id) && isTimerRunning(b.id)) return 1
    // then by subtask status
    const aOrd = a.status === 'in-progress' ? 0 : a.status === 'todo' ? 1 : 2
    const bOrd = b.status === 'in-progress' ? 0 : b.status === 'todo' ? 1 : 2
    return aOrd - bOrd
  })
}

// ─── Today's log ──────────────────────────────────────────────────────────────
const todayEntries = computed(() => {
  const today = new Date()
  return [...store.timeEntries.value]
    .filter((e) => sameDay(new Date(e.startedAt), today))
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
})

// ─── Full timesheet ────────────────────────────────────────────────────────────
const sortedEntries = computed(() =>
  [...store.timeEntries.value].sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
)

const filteredEntries = computed(() =>
  memberFilter.value ? sortedEntries.value.filter((e) => e.memberId === memberFilter.value) : sortedEntries.value
)

// ─── Manual entry ─────────────────────────────────────────────────────────────
const memberName = (memberId?: string) =>
  members.value.find((m) => m.id === memberId)?.name ?? 'Unassigned'

const submitManualEntry = async () => {
  if (!manual.taskId || manual.durationMinutes < 5) return
  const task = tasks.value.find((t) => t.id === manual.taskId)
  if (!task) return
  const started = new Date(`${manual.date}T09:00:00.000Z`)
  const stopped = new Date(started.getTime() + manual.durationMinutes * 60000)
  await store.createTimeEntry({
    taskId: task.id,
    taskTitle: task.title,
    memberId: task.assigneeId ?? '',
    startedAt: started.toISOString(),
    stoppedAt: stopped.toISOString(),
    durationMinutes: manual.durationMinutes,
    notes: manual.notes,
    billable: manual.billable,
  })
  manual.notes = ''
  manual.durationMinutes = 30
}

const deleteEntry = async (entryId: string) => {
  const confirmed = confirm('Delete this time entry? This cannot be undone.')
  if (!confirmed) return
  await store.deleteTimeEntry(entryId)
}

onMounted(async () => {
  await store.loadAll()
  if (!manual.taskId && tasks.value.length) manual.taskId = tasks.value[0]?.id ?? ''
  clockInterval = setInterval(() => { now.value = Date.now() }, 1000)
})

onUnmounted(() => { if (clockInterval) clearInterval(clockInterval) })

watchEffect(() => {
  if (!manual.taskId && tasks.value.length) manual.taskId = tasks.value[0]?.id ?? ''
})
</script>
