<template>
  <div class="app-shell">
    <aside class="sidebar">
      <div class="brand">
        <div class="brand-logo-mark">
          <svg width="22" height="22" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="32" height="32" rx="8" fill="var(--accent)"/>
            <rect x="7" y="8" width="5" height="16" rx="2" fill="white"/>
            <rect x="14" y="8" width="5" height="10" rx="2" fill="white" opacity="0.7"/>
            <rect x="21" y="13" width="4" height="11" rx="2" fill="white" opacity="0.5"/>
          </svg>
        </div>
        BIM WOW
      </div>
      <nav class="nav-list">
        <NuxtLink to="/" class="nav-link" exact-active-class="active">Kanban board</NuxtLink>
        <NuxtLink to="/projects" class="nav-link" active-class="active">Projects</NuxtLink>
        <NuxtLink to="/profile" class="nav-link" active-class="active">Profile</NuxtLink>
        <NuxtLink to="/timesheet" class="nav-link" active-class="active">My Timesheet</NuxtLink>
        <NuxtLink to="/time-tracking" class="nav-link" active-class="active">Tracking history</NuxtLink>
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
        <div class="topbar-brand">
          <div class="topbar-logo-mark">
            <svg width="28" height="28" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="32" height="32" rx="8" fill="var(--accent)" />
              <rect x="7" y="8" width="5" height="16" rx="2" fill="white" />
              <rect x="14" y="8" width="5" height="10" rx="2" fill="white" opacity="0.7" />
              <rect x="21" y="13" width="4" height="11" rx="2" fill="white" opacity="0.5" />
            </svg>
          </div>
          <div class="topbar-brand-text">
            <span class="topbar-brand-name">BIM WOW</span>
            <span class="topbar-brand-sub">Management System</span>
          </div>
        </div>

        <div class="topbar-right">
          <span class="topbar-date">{{ new Date().toLocaleDateString('en-GB', {
            weekday: 'short', day: 'numeric', month:
              'short', year: 'numeric' }) }}</span>
          <NuxtLink to="/profile" class="topbar-avatar" title="Kamal">KA</NuxtLink>
        </div>
      </header>
      <main class="page-content pt-2">
        <NuxtPage />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { usePocStore } from '~/composables/usePocStore'

const store = usePocStore()
const activeTask = store.activeTask
const activeTimer = store.activeTimer
const tasks = store.filteredTasks
const timeEntries = store.timeEntries
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
    (sum, e) => (sameDay(new Date(e.startedAt), today) ? sum + e.durationMinutes : sum),
    0,
  )
})

const weekMins = computed(() => {
  const weekStart = new Date()
  weekStart.setDate(weekStart.getDate() - 7)
  return timeEntries.value.reduce(
    (sum, e) => (new Date(e.startedAt) >= weekStart ? sum + e.durationMinutes : sum),
    0,
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
