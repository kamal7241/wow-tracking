<template>
  <div class="app-shell">
    <aside class="sidebar">
      <div class="brand">BIM WOW</div>
      <nav class="nav-list">
        <NuxtLink to="/" class="nav-link" exact-active-class="active">Kanban board</NuxtLink>
        <NuxtLink to="/time-tracking" class="nav-link" active-class="active">Time tracking</NuxtLink>
      </nav>

      <!-- Board overview (always visible) -->
      <div class="sidebar-section">
        <p class="sidebar-section-label">Board overview</p>
        <div v-for="stat in boardStats" :key="stat.key" class="sidebar-stat-row">
          <span class="sidebar-stat-dot" :data-status="stat.key"></span>
          <span class="sidebar-stat-label">{{ stat.label }}</span>
          <span class="sidebar-stat-count">{{ stat.count }}</span>
        </div>
      </div>

      <!-- Time summary (always visible) -->
      <div class="sidebar-section">
        <p class="sidebar-section-label">Time summary</p>
        <div class="sidebar-stat-row">
          <span class="sidebar-stat-label">Today</span>
          <span class="sidebar-stat-count">{{ formatMins(todayMins) }}</span>
        </div>
        <div class="sidebar-stat-row">
          <span class="sidebar-stat-label">This week</span>
          <span class="sidebar-stat-count">{{ formatMins(weekMins) }}</span>
        </div>
        <div class="sidebar-stat-row">
          <span class="sidebar-stat-label">Total entries</span>
          <span class="sidebar-stat-count">{{ timeEntries.length }}</span>
        </div>
      </div>

      <div v-if="activeTask" class="sidebar-timer">
        <p class="sidebar-timer-label">Tracking now</p>
        <p class="sidebar-timer-task">{{ activeTask.title }}</p>
        <div class="sidebar-timer-row">
          <span class="timer-elapsed">⏱ {{ elapsedDisplay }}</span>
          <button class="sidebar-timer-stop" type="button" @click="stopActiveTimer">Stop</button>
        </div>
      </div>

      <div class="sidebar-footer">
        <span class="status-pill">POC Preview</span>
        <small>Modern flat UI for client demo</small>
      </div>
    </aside>

    <div class="content-area">
      <header class="topbar">
        <div>
          <p class="eyebrow">BIM WOW Management</p>
          <h1>Proof of Concept</h1>
        </div>
        <div class="topbar-actions">
          <span class="chip">Nuxt POC</span>
        </div>
      </header>
      <main class="page-content">
        <NuxtPage />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { usePocStore } from '../composables/usePocStore'

const store = usePocStore()
const activeTask = store.activeTask
const activeTimer = store.activeTimer
const tasks = store.tasks
const timeEntries = store.timeEntries
const route = useRoute()
const now = ref(Date.now())
let clockInterval: ReturnType<typeof setInterval> | null = null

const boardStats = computed(() => [
  { key: 'todo', label: 'To Do', count: tasks.value.filter((t) => t.status === 'todo').length },
  { key: 'in-progress', label: 'In Progress', count: tasks.value.filter((t) => t.status === 'in-progress').length },
  { key: 'in-review', label: 'In Review', count: tasks.value.filter((t) => t.status === 'in-review').length },
  { key: 'done', label: 'Done', count: tasks.value.filter((t) => t.status === 'done').length },
])

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()

const todayMins = computed(() => {
  const today = new Date()
  return timeEntries.value.reduce(
    (sum, e) => (sameDay(new Date(e.startedAt), today) ? sum + e.durationMinutes : sum), 0,
  )
})

const weekMins = computed(() => {
  const weekStart = new Date()
  weekStart.setDate(weekStart.getDate() - 7)
  return timeEntries.value.reduce(
    (sum, e) => (new Date(e.startedAt) >= weekStart ? sum + e.durationMinutes : sum), 0,
  )
})

const formatMins = (mins: number) => {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

const elapsedDisplay = computed(() => {
  const timer = activeTimer.value
  if (!timer?.startedAt) return '0:00:00'
  const diff = Math.max(0, now.value - new Date(timer.startedAt).getTime())
  const totalSeconds = Math.floor(diff / 1000)
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
})

const stopActiveTimer = async () => {
  await store.stopTimer()
}

onMounted(() => {
  clockInterval = setInterval(() => { now.value = Date.now() }, 1000)
})

onUnmounted(() => {
  if (clockInterval) clearInterval(clockInterval)
})
</script>
