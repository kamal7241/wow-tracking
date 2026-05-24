<template>
  <div class="app-shell">
    <aside class="sidebar">
      <div class="brand">BIM WOW</div>
      <p class="sidebar-copy">POC task management + time tracking</p>
      <nav class="nav-list">
        <NuxtLink to="/" class="nav-link" exact-active-class="active">Kanban board</NuxtLink>
        <NuxtLink to="/time-tracking" class="nav-link" active-class="active">Time tracking</NuxtLink>
      </nav>

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
const now = ref(Date.now())
let clockInterval: ReturnType<typeof setInterval> | null = null

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
