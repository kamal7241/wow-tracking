<template>
  <section class="ts-page">

    <!-- ── Hero ── -->
    <div class="ts-hero">
      <div class="ts-hero-left">
        <p class="ts-greeting">{{ greeting }}, Kamal 👋</p>
        <h2 class="ts-hero-date">{{ todayLabel }}</h2>
      </div>
      <div class="ts-hero-right">
        <div class="ts-day-stats">
          <div class="ts-stat">
            <span class="ts-stat-value">{{ formatMins(loggedMinutes) }}</span>
            <span class="ts-stat-label">Logged</span>
          </div>
          <div class="ts-stat-sep"></div>
          <div class="ts-stat" :class="{ 'ts-stat--done': remainingMinutes <= 0 }">
            <span class="ts-stat-value">{{ remainingMinutes > 0 ? formatMins(remainingMinutes) : 'Done ✓' }}</span>
            <span class="ts-stat-label">Remaining ({{ TARGET_HOURS }}h day)</span>
          </div>
          <div class="ts-stat-sep"></div>
          <div class="ts-stat" :class="{ 'ts-stat--running': activeTimers.length > 0 }">
            <span class="ts-stat-value">{{ activeTimers.length }}</span>
            <span class="ts-stat-label">{{ activeTimers.length === 1 ? 'Running' : 'Running' }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Workday progress bar ── -->
    <div class="ts-progress-wrap">
      <div class="ts-progress-track">
        <div class="ts-progress-fill" :style="{ width: dayPct + '%' }"></div>
        <div
          v-if="activeTimers.length"
          class="ts-progress-live"
          :style="{ left: dayPct + '%', width: livePct + '%' }"
        ></div>
        <div class="ts-progress-target" :style="{ left: '100%' }"></div>
      </div>
      <div class="ts-progress-labels">
        <span>0h</span>
        <span>{{ TARGET_HOURS / 2 }}h</span>
        <span>{{ TARGET_HOURS }}h</span>
      </div>
    </div>

    <!-- ── Active timers banner ── -->
    <div v-if="activeTimers.length" class="ts-running-banner">
      <div class="ts-running-title">
        <span class="ts-running-dot"></span>
        Running now
      </div>
      <div class="ts-running-cards">
        <div v-for="timer in activeTimers" :key="timer.id" class="ts-running-card">
          <div class="ts-running-card-info">
            <span class="ts-running-feature">{{ timer.taskTitle }}</span>
            <span v-if="timer.subtaskTitle" class="ts-running-sub">
              <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
              {{ timer.subtaskTitle }}
            </span>
          </div>
          <div class="ts-running-card-right">
            <span class="ts-running-elapsed">{{ elapsedForTimer(timer) }}</span>
            <button class="ts-stop-btn" type="button" @click="store.stopTimer(timer.subtaskId)">
              <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>
              Stop
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Tab bar ── -->
    <div class="ts-tab-bar">
      <button :class="['ts-tab-btn', { 'ts-tab-btn--active': activeTab === 'my-tasks' }]" type="button" @click="activeTab = 'my-tasks'">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
        My Tasks
      </button>
      <button :class="['ts-tab-btn', { 'ts-tab-btn--active': activeTab === 'timesheet' }]" type="button" @click="activeTab = 'timesheet'">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        Timesheet
      </button>
    </div>

    <!-- ── My Tasks tab ── -->
    <div v-if="activeTab === 'my-tasks'" class="ts-main">

      <!-- Left: My tasks -->
      <div class="ts-col-tasks">
        <div class="panel">
          <div class="ts-tasks-header">
            <div>
              <h3 class="page-title">My tasks</h3>
              <p class="page-subtitle">{{ myTasks.length }} feature{{ myTasks.length !== 1 ? 's' : '' }} assigned to you</p>
            </div>
            <div class="ts-search-wrap">
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input v-model="search" class="ts-search" placeholder="Filter tasks…" />
            </div>
          </div>

          <div v-if="filteredTasks.length === 0" class="ts-empty">
            <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            <p>No tasks assigned to you.</p>
          </div>

          <div v-for="feature in filteredTasks" :key="feature.id" class="ts-feature-group">
            <!-- Feature header -->
            <div class="ts-feature-head">
              <div class="ts-feature-title-row">
                <span :class="['ts-priority-dot', 'ts-priority-dot--' + feature.priority]"></span>
                <span class="ts-feature-name">{{ feature.title }}</span>
                <span :class="['badge', feature.priority]">{{ priorityLabels[feature.priority] }}</span>
              </div>
              <div class="ts-feature-head-right">
                <span v-if="projectName(feature.projectId)" class="ts-project-badge">{{ projectName(feature.projectId) }}</span>
                <span :class="['ts-status-chip', 'ts-status-chip--' + feature.status]">{{ statusLabels[feature.status] }}</span>
              </div>
            </div>

            <!-- My subtasks in this feature -->
            <div class="ts-subtask-list">
              <button
                v-for="sub in mySubtasksOf(feature)"
                :key="sub.id"
                :class="['ts-subtask-row', {
                  'ts-subtask-row--active': isRunning(sub.id),
                  'ts-subtask-row--done': sub.status === 'done',
                }]"
                type="button"
                :disabled="sub.status === 'done'"
                @click="toggleTimer(feature, sub)"
              >
                <!-- Status icon -->
                <span class="ts-sub-icon">
                  <svg v-if="sub.status === 'done'" width="14" height="14" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="3" fill="var(--success)"/><path d="M7 12l3.5 3.5L17 8" stroke="white" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
                  <svg v-else-if="sub.status === 'in-progress'" width="14" height="14" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="3" stroke="var(--accent)" stroke-width="2" fill="var(--accent-soft)"/><line x1="8" y1="12" x2="16" y2="12" stroke="var(--accent)" stroke-width="2.5" stroke-linecap="round"/></svg>
                  <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--border)" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="3"/></svg>
                </span>

                <div class="ts-sub-info">
                  <span class="ts-sub-title">{{ sub.title }}</span>
                  <div class="ts-sub-meta">
                    <span v-if="sub.estimatedHours" class="ts-sub-badge ts-sub-badge--est">
                      <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                      {{ sub.estimatedHours }}h est
                    </span>
                    <span v-if="loggedTodayForSub(sub.id) > 0" class="ts-sub-badge ts-sub-badge--today">
                      {{ formatMins(loggedTodayForSub(sub.id)) }} today
                    </span>
                    <span v-if="isRunning(sub.id)" class="ts-sub-badge ts-sub-badge--live">
                      {{ elapsedForSubtask(sub.id) }}
                    </span>
                  </div>
                </div>

                <div class="ts-sub-action">
                  <span v-if="!isRunning(sub.id)" class="ts-play-btn">
                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                    Start
                  </span>
                  <span v-else class="ts-play-btn ts-play-btn--stop">
                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>
                    Stop
                  </span>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Right: Today's log + Manual entry -->
      <div class="ts-col-right">

        <!-- Today's log -->
        <div class="panel">
          <div class="ts-log-head">
            <h3 class="page-title">Today's log</h3>
            <span class="ts-log-total">{{ formatMins(loggedMinutes) }}</span>
          </div>

          <div v-if="todayLog.length === 0" class="ts-empty ts-empty--sm">
            <p>Nothing logged today yet.</p>
          </div>

          <div v-else class="ts-log-list">
            <div v-for="entry in todayLog" :key="entry.id" class="ts-log-entry">
              <div class="ts-log-left">
                <span class="ts-log-task">{{ entry.taskTitle }}</span>
                <span v-if="entry.subtaskTitle" class="ts-log-sub">{{ entry.subtaskTitle }}</span>
              </div>
              <div class="ts-log-right">
                <span class="ts-log-dur">{{ formatMins(entry.durationMinutes) }}</span>
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
            <label>Task / Subtask</label>
            <select v-model="manual.subtaskKey">
              <optgroup v-for="feature in allPickerTasks" :key="feature.id" :label="feature.title">
                <option v-if="!feature.subtasks?.length" :value="feature.id + '|'">{{ feature.title }}</option>
                <option v-for="sub in feature.subtasks" :key="sub.id" :value="feature.id + '|' + sub.id">
                  {{ sub.title }}
                </option>
              </optgroup>
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
              <label>Notes</label>
              <input v-model="manual.notes" placeholder="Optional" />
            </div>
            <div class="field">
              <label>Billable</label>
              <select v-model="manual.billable">
                <option :value="true">Yes</option>
                <option :value="false">No</option>
              </select>
            </div>
          </div>
          <button class="button" style="width:100%;margin-top:4px;" @click="submitManual">Add entry</button>
        </div>

      </div>
    </div>

    <!-- ── Timesheet calendar tab ── -->
    <div v-if="activeTab === 'timesheet'" class="ts-sheet-wrap">

      <!-- Week navigation -->
      <div class="ts-week-nav">
        <button class="icon-btn" type="button" title="Previous week" @click="shiftWeek(-1)">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <span class="ts-week-label">{{ weekLabel }}</span>
        <button class="icon-btn" type="button" title="Next week" @click="shiftWeek(1)">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
        <button v-if="!isCurrentWeek" class="button button-secondary" style="padding:5px 14px;font-size:0.8rem;" type="button" @click="goToCurrentWeek">Today</button>
        <span class="ts-week-total">{{ formatMins(weekTotalMinutes) }} total</span>
      </div>

      <!-- 24-hour calendar grid -->
      <div class="cal-container">
        <!-- Sticky day header -->
        <div class="cal-header">
          <div class="cal-gutter-head"></div>
          <div
            v-for="day in weekDays"
            :key="day.toISOString()"
            :class="['cal-day-head', { 'cal-day-head--today': isToday(day) }]"
          >
            <span class="cal-day-name">{{ dayName(day) }}</span>
            <div :class="['cal-day-num', { 'cal-day-num--today': isToday(day) }]">{{ day.getDate() }}</div>
          </div>
        </div>

        <!-- Scrollable 24-hr body -->
        <div class="cal-body" ref="calBodyRef">
          <!-- Time label gutter -->
          <div class="cal-time-col">
            <div v-for="h in 24" :key="h" class="cal-hour-label">
              {{ String(h - 1).padStart(2, '0') }}:00
            </div>
          </div>

          <!-- One column per day -->
          <div
            v-for="day in weekDays"
            :key="day.toISOString()"
            :class="['cal-day-col', { 'cal-day-col--today': isToday(day) }]"
            @click.self="openSlotPicker($event)"
          >
            <!-- Hour slot lines — click to start a task -->
            <div v-for="h in 24" :key="h" class="cal-hour-slot" @click="openSlotPicker($event)"></div>

            <!-- Current-time red line (today only) -->
            <div v-if="isToday(day)" class="cal-now-line" :style="nowLineStyle"></div>

            <!-- Completed session blocks -->
            <div
              v-for="entry in calEntriesForDay(day)"
              :key="entry.id"
              :class="['cal-event', 'cal-event--' + calPriorityFor(entry.subtaskId)]"
              :style="calEventStyle(entry.startedAt, entry.durationMinutes)"
            >
              <div class="cal-event-title">{{ entry.subtaskTitle }}</div>
              <div class="cal-event-dur">{{ fmtDuration(entry.durationMinutes) }}</div>
              <button
                v-if="!isRunning(entry.subtaskId)"
                class="cal-event-action-btn cal-event-action-btn--resume"
                type="button"
                title="Resume timer"
                @click.stop="resumeEntry(entry)"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
              </button>
            </div>

            <!-- Live timer blocks (today only) -->
            <template v-if="isToday(day)">
              <div
                v-for="timer in activeTimers"
                :key="'live-' + timer.subtaskId"
                class="cal-event cal-event--live"
                :style="calLiveEventStyle(timer)"
              >
                <div class="cal-event-live-dot"></div>
                <div class="cal-event-title">{{ timer.subtaskTitle }}</div>
                <div class="cal-event-dur">{{ elapsedForSubtask(timer.subtaskId) }}</div>
                <button class="cal-event-action-btn cal-event-action-btn--stop" type="button" title="Stop timer" @click.stop="store.stopTimer(timer.subtaskId)">
                  <svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2"/></svg>
                </button>
              </div>
            </template>
          </div>
        </div>
      </div>
      <p class="ts-grid-hint">Click any slot to start tracking · Hover a session block to resume or stop</p>
    </div>

    <!-- ── Task picker popover ── -->
    <Teleport to="body">
      <div
        v-if="slotPicker.show"
        class="cal-picker"
        :style="{ top: slotPicker.y + 'px', left: slotPicker.x + 'px' }"
      >
        <div class="cal-picker-header">
          <span>Start tracking</span>
          <button class="cal-picker-close" type="button" @click="slotPicker.show = false">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="cal-picker-list">
          <button
            v-for="item in slotPickerTasks"
            :key="item.subId"
            class="cal-picker-item"
            type="button"
            @click="startFromPicker(item)"
          >
            <span :class="['cal-picker-dot', 'cal-picker-dot--' + item.priority]"></span>
            <div class="cal-picker-info">
              <span class="cal-picker-title">{{ item.subTitle }}</span>
              <span class="cal-picker-feature">{{ item.featureTitle }}</span>
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="currentColor" class="cal-picker-play"><path d="M8 5v14l11-7z"/></svg>
          </button>
          <div v-if="slotPickerTasks.length === 0" class="cal-picker-empty">No tasks available</div>
        </div>
      </div>
    </Teleport>

  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watchEffect } from 'vue'
import { usePocStore } from '@/composables/usePocStore'
import type { Task, Subtask, TimeEntry } from '@/composables/usePocStore'

// ─── Tab state ────────────────────────────────────────────────────────────────
const activeTab = ref<'my-tasks' | 'timesheet'>('my-tasks')

// ─── Constants ───────────────────────────────────────────────────────────────
const ME = 'member-kamal'
const TARGET_HOURS = 8

const store = usePocStore()
const tasks = store.tasks
const members = store.members
const projects = store.projects
const activeTimers = store.activeTimers

const projectName = (projectId?: string) => {
  if (!projectId) return ''
  return projects.value.find(p => p.id === projectId)?.name ?? ''
}

// ─── 24h Calendar ─────────────────────────────────────────────────────────────
const HOUR_H = 64 // px per hour row
const calBodyRef = ref<HTMLElement | null>(null)

const calEntriesForDay = (day: Date): TimeEntry[] =>
  store.timeEntries.value.filter(
    e => e.memberId === ME && sameDay(new Date(e.startedAt), day) && !!e.stoppedAt,
  )

const calPriorityFor = (subtaskId: string): string => {
  for (const g of sheetRows.value) {
    if (g.subtasks.some(s => s.id === subtaskId)) return g.priority
  }
  return 'medium'
}

const calEventStyle = (startedAt: string, durationMins: number) => {
  const start = new Date(startedAt)
  const startMin = start.getHours() * 60 + start.getMinutes()
  return {
    top: `${(startMin / 60) * HOUR_H}px`,
    height: `${Math.max(22, (durationMins / 60) * HOUR_H)}px`,
  }
}

const calLiveEventStyle = (timer: TimeEntry) => {
  const start = new Date(timer.startedAt)
  const startMin = start.getHours() * 60 + start.getMinutes()
  const elapsedMins = (now.value - start.getTime()) / 60000
  return {
    top: `${(startMin / 60) * HOUR_H}px`,
    height: `${Math.max(28, (elapsedMins / 60) * HOUR_H)}px`,
  }
}

const nowLineStyle = computed(() => {
  const d = new Date(now.value)
  return { top: `${(d.getHours() * 60 + d.getMinutes()) / 60 * HOUR_H}px` }
})

const fmtDuration = (mins: number): string => {
  if (mins < 60) return `${Math.round(mins)}m`
  const h = Math.floor(mins / 60)
  const m = Math.round(mins % 60)
  return m ? `${h}h ${m}m` : `${h}h`
}

// ─── Resume a completed session ────────────────────────────────────────────────
const resumeEntry = async (entry: TimeEntry) => {
  const feature = tasks.value.find(t => t.subtasks?.some(s => s.id === entry.subtaskId))
  const sub = feature?.subtasks?.find(s => s.id === entry.subtaskId)
  if (feature && sub) await store.startTimer(feature, sub)
}

// ─── Slot task picker ───────────────────────────────────────────────────────
const slotPicker = reactive({ show: false, x: 0, y: 0 })

const slotPickerTasks = computed(() =>
  sheetRows.value.flatMap(g =>
    g.subtasks
      .filter(s => s.status !== 'done' && !isRunning(s.id))
      .map(s => ({ subId: s.id, subTitle: s.title, featureId: g.featureId, featureTitle: g.featureTitle, priority: g.priority }))
  )
)

const openSlotPicker = (event: MouseEvent) => {
  event.stopPropagation()
  const col = (event.currentTarget as HTMLElement).closest?.('.cal-day-col') as HTMLElement
               ?? event.currentTarget as HTMLElement
  const rect = col.getBoundingClientRect()
  slotPicker.x = Math.min(rect.right + 8, window.innerWidth - 256)
  slotPicker.y = Math.max(8, event.clientY - 16)
  slotPicker.show = true
}

const startFromPicker = async (item: { subId: string; featureId: string }) => {
  const feature = tasks.value.find(t => t.id === item.featureId)
  const sub = feature?.subtasks?.find(s => s.id === item.subId)
  if (feature && sub) await store.startTimer(feature, sub)
  slotPicker.show = false
}

const closePicker = (e: MouseEvent) => {
  if (!(e.target as HTMLElement).closest('.cal-picker')) slotPicker.show = false
}

const search = ref('')
const now = ref(Date.now())
let clockInterval: ReturnType<typeof setInterval> | null = null

// ─── Labels / helpers ─────────────────────────────────────────────────────────
const statusLabels: Record<string, string> = {
  todo: 'To Do', 'in-progress': 'In Progress', 'in-review': 'In Review', done: 'Done',
}
const priorityLabels: Record<string, string> = {
  low: 'Low', medium: 'Medium', high: 'High', critical: 'Critical',
}

const formatMins = (mins: number) => {
  const h = Math.floor(mins / 60)
  const m = Math.round(mins % 60)
  return h > 0 ? `${h}h ${m > 0 ? m + 'm' : ''}`.trim() : `${m}m`
}

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate()

// ─── Greeting & date ─────────────────────────────────────────────────────────
const todayLabel = new Intl.DateTimeFormat('en-US', {
  weekday: 'long', month: 'long', day: 'numeric',
}).format(new Date())

const greeting = computed(() => {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
})

// ─── Workday progress ─────────────────────────────────────────────────────────
const loggedMinutes = computed(() => {
  const today = new Date()
  return store.timeEntries.value
    .filter(e => e.memberId === ME && sameDay(new Date(e.startedAt), today))
    .reduce((s, e) => s + e.durationMinutes, 0)
})

const liveElapsed = computed(() =>
  activeTimers.value.reduce((sum, t) => {
    if (!t.startedAt) return sum
    return sum + (now.value - new Date(t.startedAt).getTime()) / 60000
  }, 0)
)

const remainingMinutes = computed(() =>
  Math.max(0, TARGET_HOURS * 60 - loggedMinutes.value - liveElapsed.value)
)

const dayPct = computed(() =>
  Math.min(100, (loggedMinutes.value / (TARGET_HOURS * 60)) * 100)
)
const livePct = computed(() =>
  Math.min(100 - dayPct.value, (liveElapsed.value / (TARGET_HOURS * 60)) * 100)
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

const elapsedForSubtask = (subtaskId: string) => {
  const timer = activeTimers.value.find(t => t.subtaskId === subtaskId)
  return timer ? elapsedForTimer(timer) : '0:00:00'
}

const isRunning = (subtaskId: string) =>
  activeTimers.value.some(t => t.subtaskId === subtaskId)

const toggleTimer = async (feature: Task, sub: Subtask) => {
  if (isRunning(sub.id)) {
    await store.stopTimer(sub.id)
  } else {
    await store.startTimer(feature, sub)
  }
}

// ─── My tasks ─────────────────────────────────────────────────────────────────
const myTasks = computed(() =>
  tasks.value.filter(t =>
    t.status !== 'done' &&
    (t.subtasks ?? []).some(s => s.assigneeId === ME)
  )
)

const mySubtasksOf = (feature: Task): Subtask[] =>
  (feature.subtasks ?? []).filter(s => s.assigneeId === ME)

const filteredTasks = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return myTasks.value
  return myTasks.value.filter(t =>
    t.title.toLowerCase().includes(q) ||
    mySubtasksOf(t).some(s => s.title.toLowerCase().includes(q))
  )
})

// ─── Logged today (per subtask) ───────────────────────────────────────────────
const loggedTodayForSub = (subtaskId: string): number => {
  const today = new Date()
  return store.timeEntries.value
    .filter(e => e.subtaskId === subtaskId && sameDay(new Date(e.startedAt), today))
    .reduce((s, e) => s + e.durationMinutes, 0)
}

// ─── Today's log ──────────────────────────────────────────────────────────────
const todayLog = computed(() => {
  const today = new Date()
  return [...store.timeEntries.value]
    .filter(e => e.memberId === ME && sameDay(new Date(e.startedAt), today))
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
})

const deleteEntry = async (id: string) => {
  if (!confirm('Delete this time entry?')) return
  await store.deleteTimeEntry(id)
}

// ─── Manual entry ─────────────────────────────────────────────────────────────
const allPickerTasks = computed(() =>
  tasks.value.filter(t => t.status !== 'done')
)

const manual = reactive({
  subtaskKey: '',
  durationMinutes: 30,
  date: new Date().toISOString().slice(0, 10),
  notes: '',
  billable: true,
})

const submitManual = async () => {
  if (!manual.subtaskKey || manual.durationMinutes < 5) return
  const [taskId, subtaskId] = manual.subtaskKey.split('|')
  const feature = tasks.value.find(t => t.id === taskId)
  if (!feature) return
  const sub = subtaskId ? (feature.subtasks ?? []).find(s => s.id === subtaskId) : null
  const started = new Date(`${manual.date}T09:00:00.000Z`)
  const stopped = new Date(started.getTime() + manual.durationMinutes * 60000)
  await store.createTimeEntry({
    taskId: feature.id,
    taskTitle: feature.title,
    memberId: ME,
    subtaskId: sub?.id,
    subtaskTitle: sub?.title,
    startedAt: started.toISOString(),
    stoppedAt: stopped.toISOString(),
    durationMinutes: manual.durationMinutes,
    notes: manual.notes,
    billable: manual.billable,
  })
  manual.notes = ''
  manual.durationMinutes = 30
}

// ─── Week navigation ───────────────────────────────────────────────────────────────
const weekOffset = ref(0)

const getMonday = (d: Date): Date => {
  const date = new Date(d)
  const day = date.getDay()
  const diff = (day === 0 ? -6 : 1 - day)
  date.setDate(date.getDate() + diff)
  date.setHours(0, 0, 0, 0)
  return date
}

const weekStart = computed(() => {
  const base = getMonday(new Date())
  base.setDate(base.getDate() + weekOffset.value * 7)
  return base
})

const weekDays = computed((): Date[] =>
  Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart.value)
    d.setDate(d.getDate() + i)
    return d
  })
)

const weekLabel = computed(() => {
  const fmt = (d: Date) => new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(d)
  const end = weekDays.value[6]
  return `${fmt(weekStart.value)} – ${fmt(end)}, ${end.getFullYear()}`
})

const isCurrentWeek = computed(() => weekOffset.value === 0)

const shiftWeek = (delta: number) => { weekOffset.value += delta }
const goToCurrentWeek = () => { weekOffset.value = 0 }

const isToday = (d: Date): boolean => {
  const t = new Date()
  return d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth() && d.getDate() === t.getDate()
}

const dayName = (d: Date) => new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(d)
const dayNum  = (d: Date) => new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'short' }).format(d)

// ─── Sheet rows (Kamal's subtasks grouped by feature) ─────────────────────────
interface SheetGroup {
  featureId: string
  featureTitle: string
  priority: string
  status: string
  subtasks: Subtask[]
}

const sheetRows = computed((): SheetGroup[] =>
  tasks.value
    .filter(t => (t.subtasks ?? []).some(s => s.assigneeId === ME))
    .map(t => ({
      featureId: t.id,
      featureTitle: t.title,
      priority: t.priority,
      status: t.status,
      subtasks: (t.subtasks ?? []).filter(s => s.assigneeId === ME),
    }))
)

// ─── Cell data helpers ───────────────────────────────────────────────────────────────
const cellMins = (subtaskId: string, day: Date): number =>
  store.timeEntries.value
    .filter(e => e.subtaskId === subtaskId && sameDay(new Date(e.startedAt), day))
    .reduce((s, e) => s + e.durationMinutes, 0)

const fmtHours = (mins: number): string => {
  if (mins === 0) return ''
  const h = mins / 60
  return h % 1 === 0 ? `${h}h` : `${parseFloat(h.toFixed(1))}h`
}

const entriesForCell = (subtaskId: string, day: Date): TimeEntry[] =>
  store.timeEntries.value.filter(e => e.subtaskId === subtaskId && sameDay(new Date(e.startedAt), day))

const slotBarPct = (durationMins: number, estimatedHours?: number): number => {
  if (!estimatedHours) return 100
  return Math.min(100, Math.round((durationMins / (estimatedHours * 60)) * 100))
}

const rowTotalMins = (subtaskId: string): number => {
  const start = weekDays.value[0]
  const end = weekDays.value[6]
  return store.timeEntries.value
    .filter(e => e.subtaskId === subtaskId &&
      new Date(e.startedAt) >= start &&
      new Date(e.startedAt) <= new Date(end.getTime() + 86399999))
    .reduce((s, e) => s + e.durationMinutes, 0)
}
const rowTotalStr = (subtaskId: string) => fmtHours(rowTotalMins(subtaskId)) || '–'

const dayTotalMins = (day: Date): number =>
  sheetRows.value
    .flatMap(g => g.subtasks)
    .reduce((s, sub) => s + cellMins(sub.id, day), 0)
const dayTotalStr = (day: Date) => fmtHours(dayTotalMins(day)) || '–'

const weekTotalMinutes = computed(() =>
  weekDays.value.reduce((s, d) => s + dayTotalMins(d), 0)
)

// ─── Grid timer toggle ───────────────────────────────────────────────────────────────
const toggleTimerFromGrid = async (sub: Subtask, group: SheetGroup) => {
  if (isRunning(sub.id)) {
    await store.stopTimer(sub.id)
  } else {
    const feature = tasks.value.find(t => t.id === group.featureId)
    if (feature) await store.startTimer(feature, sub)
  }
}

watchEffect(() => {
  if (!manual.subtaskKey && allPickerTasks.value.length) {
    const first = allPickerTasks.value[0]
    const firstSub = first.subtasks?.[0]
    manual.subtaskKey = firstSub ? `${first.id}|${firstSub.id}` : `${first.id}|`
  }
})

onMounted(async () => {
  await store.loadAll()
  clockInterval = setInterval(() => { now.value = Date.now() }, 1000)
  await nextTick()
  if (calBodyRef.value) {
    const h = new Date().getHours()
    calBodyRef.value.scrollTop = Math.max(0, (h - 1) * HOUR_H)
  }
  document.addEventListener('click', closePicker)
})
onUnmounted(() => {
  if (clockInterval) clearInterval(clockInterval)
  document.removeEventListener('click', closePicker)
})
</script>
