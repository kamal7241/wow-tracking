<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { usePocStore } from '~/composables/usePocStore'
import type { Member } from '~/composables/usePocStore'

const store = usePocStore()

// State
const selectedMemberId = ref<string>('member-kamal')

const members = store.members
const tasks = store.tasks

onMounted(() => {
  store.loadAll()
})

// Computed
const currentMember = computed<Member | null>(() => {
  return members.value.find(m => m.id === selectedMemberId.value) || null
})

// Calculate Task Stats - include tasks where member is assignee OR has subtasks assigned
const memberTasks = computed(() => {
  return tasks.value.filter(t => 
    t.assigneeId === selectedMemberId.value ||
    t.subtasks?.some(s => s.assigneeId === selectedMemberId.value)
  )
})

const taskStats = computed(() => {
  const all = memberTasks.value
  const total = all.length
  if (total === 0) return { onTrack: 0, overdue: 0, done: 0, total: 0, delayPercentage: 0 }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const done = all.filter(t => t.status === 'done').length
  const active = all.filter(t => t.status !== 'done')
  const overdue = active.filter(t => {
    if (!t.dueDate) return false
    return new Date(t.dueDate) < today
  }).length
  const onTrack = active.length - overdue

  // Delay % = overdue / (overdue + on track) — excludes done tasks
  const activeTotal = overdue + onTrack
  const delayPercentage = activeTotal > 0 ? Math.round((overdue / activeTotal) * 100) : 0

  return { onTrack, overdue, done, total, delayPercentage }
})

const formatStars = (count: number) => {
  return '★'.repeat(count) + '☆'.repeat(Math.max(0, 5 - count))
}

const overallEvaluation = computed(() => {
  const m = currentMember.value
  if (!m) return 0
  const criteria = m.evaluationCriteria || []
  const allStars = [
    ...(m.experienceStars ? [m.experienceStars] : []),
    ...(m.performanceStars ? [m.performanceStars] : []),
    ...criteria.map(c => c.stars)
  ]
  if (allStars.length === 0) return 0
  return +(allStars.reduce((a, b) => a + b, 0) / allStars.length).toFixed(1)
})

const overdueTasksList = computed(() => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return memberTasks.value
    .filter(t => t.status !== 'done' && t.dueDate && new Date(t.dueDate) < today)
    .map(t => ({
      ...t,
      daysOverdue: Math.ceil((today.getTime() - new Date(t.dueDate).getTime()) / (1000 * 60 * 60 * 24))
    }))
})

const onTrackTasksList = computed(() => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return memberTasks.value
    .filter(t => t.status !== 'done' && (!t.dueDate || new Date(t.dueDate) >= today))
    .map(t => ({
      ...t,
      daysLeft: t.dueDate ? Math.ceil((new Date(t.dueDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : null
    }))
})

const doneTasksList = computed(() => {
  return memberTasks.value.filter(t => t.status === 'done')
})

// Per-project subtask summary grouped by project
const projectSummaries = computed(() => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Group tasks (features) by project
  const grouped: Record<string, Array<{
    id: string, title: string, dueDate: string, status: string, priority: string,
    subtaskTotal: number, done: number, overdue: number, onTrack: number, isOverdue: boolean
  }>> = {}

  for (const task of memberTasks.value) {
    const projectName = task.project || 'Unassigned'
    if (!grouped[projectName]) grouped[projectName] = []

    const memberSubtasks = (task.subtasks || []).filter(s => s.assigneeId === selectedMemberId.value)
    const total = memberSubtasks.length
    const done = memberSubtasks.filter(s => s.status === 'done').length
    const active = memberSubtasks.filter(s => s.status !== 'done')

    const isOverdue = !!(task.dueDate && new Date(task.dueDate) < today && task.status !== 'done')
    const overdueCount = isOverdue ? active.length : 0
    const onTrack = active.length - overdueCount

    grouped[projectName].push({
      id: task.id,
      title: task.title,
      dueDate: task.dueDate,
      status: task.status,
      priority: task.priority,
      subtaskTotal: total,
      done,
      overdue: overdueCount,
      onTrack,
      isOverdue
    })
  }

  return Object.entries(grouped).map(([project, features]) => ({
    project,
    features,
    totals: {
      subtaskTotal: features.reduce((s, f) => s + f.subtaskTotal, 0),
      done: features.reduce((s, f) => s + f.done, 0),
      overdue: features.reduce((s, f) => s + f.overdue, 0),
      onTrack: features.reduce((s, f) => s + f.onTrack, 0),
    }
  }))
})
</script>

<template>
  <div class="profile-page">
    <header class="page-header">
      <h1 class="page-title">Team Member Profile</h1>
      <div class="member-selector">
        <label for="memberSelect">Select Member: </label>
        <select id="memberSelect" v-model="selectedMemberId" class="select-input">
          <option v-for="member in members" :key="member.id" :value="member.id">
            {{ member.name }} ({{ member.role }})
          </option>
        </select>
      </div>
    </header>

    <div v-if="currentMember" class="profile-dashboard">
      <!-- Profile Header / Details -->
      <div class="card profile-header">
        <div class="profile-avatar">{{ currentMember.initials }}</div>
        <div class="profile-info">
          <h2>{{ currentMember.name }} <span class="overall-stars"><span class="overall-stars-value">{{ overallEvaluation }}/5</span> {{ formatStars(Math.round(overallEvaluation)) }}</span></h2>
          <p class="role">{{ currentMember.role }}</p>
          <div class="links" v-if="currentMember.links?.length">
            <a v-for="link in currentMember.links" :key="link.label" :href="link.url" target="_blank" rel="noopener noreferrer">
              {{ link.label }}
            </a>
          </div>
        </div>
      </div>

      <!-- Basic Information -->
      <div class="card basic-info-card" v-if="currentMember.basicInfo">
        <h3>Basic Information</h3>
        <div class="info-grid">
          <div class="info-item" v-if="currentMember.basicInfo.email">
            <span class="info-label">Email</span>
            <span class="info-value">{{ currentMember.basicInfo.email }}</span>
          </div>
          <div class="info-item" v-if="currentMember.basicInfo.phone">
            <span class="info-label">Phone</span>
            <span class="info-value">{{ currentMember.basicInfo.phone }}</span>
          </div>
          <div class="info-item" v-if="currentMember.basicInfo.department">
            <span class="info-label">Department</span>
            <span class="info-value">{{ currentMember.basicInfo.department }}</span>
          </div>
          <div class="info-item" v-if="currentMember.basicInfo.location">
            <span class="info-label">Location</span>
            <span class="info-value">{{ currentMember.basicInfo.location }}</span>
          </div>
          <div class="info-item" v-if="currentMember.basicInfo.joinDate">
            <span class="info-label">Joined</span>
            <span class="info-value">{{ new Date(currentMember.basicInfo.joinDate).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) }}</span>
          </div>
        </div>
      </div>

      <!-- Projects History -->
      <div class="card projects-card" v-if="currentMember.projectsHistory?.length">
        <h3>Projects History</h3>
        <div class="projects-table">
          <div class="project-row project-header-row">
            <span>Project</span>
            <span>Responsibility</span>
            <span>Period</span>
            <span>Status</span>
          </div>
          <div class="project-row" v-for="project in currentMember.projectsHistory" :key="project.name">
            <span class="project-name">{{ project.name }}</span>
            <span class="project-role">{{ project.role }}</span>
            <span class="project-period">{{ project.period }}</span>
            <span class="project-status" :class="project.status">{{ project.status }}</span>
          </div>
        </div>
      </div>

      <div class="dashboard-grid">
        <!-- Commitment & BIM -->
        <div class="card stats-card">
          <h3>Commitment</h3>
          <div class="badge">{{ currentMember.commitment || 'N/A' }}</div>
          
          <h3 class="mt-4">BIM Knowledge</h3>
          <div class="badge warning">{{ currentMember.bimKnowledge || 'N/A' }}</div>
        </div>

        <!-- Evaluation (merged with Performance) -->
        <div class="card evaluation-card">
          <div class="eval-header">
            <h3>Evaluation</h3>
            <div class="overall-score">
              <span class="overall-value">{{ overallEvaluation }}</span>
              <span class="overall-label">/ 5</span>
            </div>
          </div>
          <div class="eval-row">
            <span>Experience</span>
            <span class="stars">{{ formatStars(currentMember.experienceStars || 0) }}</span>
          </div>
          <div class="eval-row">
            <span>Performance</span>
            <span class="stars">{{ formatStars(currentMember.performanceStars || 0) }}</span>
          </div>
          <div v-if="currentMember.evaluationCriteria?.length">
            <div class="eval-row" v-for="evalItem in currentMember.evaluationCriteria" :key="evalItem.name">
              <span>{{ evalItem.name }}</span>
              <span class="stars">{{ formatStars(evalItem.stars || 0) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Task Delivery Health (full width, summary) -->
      <div class="card task-health-card">
        <div class="task-health-header">
          <h3>Task Delivery Health</h3>
          <div class="task-health-summary">
            <div class="progress-text-inline" :class="{ 'danger': taskStats.delayPercentage > 50 }">
              <span class="percentage">{{ taskStats.delayPercentage }}%</span>
              <span class="subtext">delay</span>
            </div>
          </div>
        </div>

        <div class="task-health-stats" v-if="taskStats.total > 0">
          <div class="health-stat on-track">
            <span class="health-stat-count">{{ taskStats.onTrack }}</span>
            <span class="health-stat-label">On Track</span>
          </div>
          <div class="health-stat overdue">
            <span class="health-stat-count">{{ taskStats.overdue }}</span>
            <span class="health-stat-label">Overdue</span>
          </div>
          <div class="health-stat done">
            <span class="health-stat-count">{{ taskStats.done }}</span>
            <span class="health-stat-label">Done</span>
          </div>
          <div class="health-stat total">
            <span class="health-stat-count">{{ taskStats.total }}</span>
            <span class="health-stat-label">Total</span>
          </div>
        </div>

        <!-- Per-project summary -->
        <div class="project-health-table" v-if="projectSummaries.length">
          <div class="project-group" v-for="group in projectSummaries" :key="group.project">
            <div class="project-group-header">
              <span class="project-group-name">{{ group.project }}</span>
              <div class="project-group-stats">
                <span class="pg-stat on-track">{{ group.totals.onTrack }} on track</span>
                <span class="pg-stat overdue">{{ group.totals.overdue }} overdue</span>
                <span class="pg-stat done">{{ group.totals.done }} done</span>
                <span class="pg-stat total">{{ group.totals.subtaskTotal }} total</span>
              </div>
            </div>
          </div>
        </div>

        <p v-else class="empty-text">No tasks assigned to this member.</p>
      </div>

        <!-- RMD Section (Development Progress) -->
        <div class="card rmd-card">
          <h3>RMD Progress</h3>
          <p class="subtext mb-2">Resource Management & Development</p>
          <div class="rmd-overall">
            <div class="progress-bar-wrap">
              <div class="progress-bar">
                <div 
                  class="progress-fill" 
                  :style="{ width: (currentMember.rmdProgress || 0) + '%' }"
                  :class="{'high': (currentMember.rmdProgress ?? 0) >= 80, 'med': (currentMember.rmdProgress ?? 0) >= 50 && (currentMember.rmdProgress ?? 0) < 80}"
                ></div>
              </div>
              <span class="progress-value">{{ currentMember.rmdProgress || 0 }}%</span>
            </div>
            <span class="rmd-overall-label">Overall</span>
          </div>
          <div class="rmd-details" v-if="currentMember.rmdDetails?.length">
            <div class="rmd-detail-row" v-for="item in currentMember.rmdDetails" :key="item.name">
              <span class="rmd-detail-name">{{ item.name }}</span>
              <div class="progress-bar-wrap">
                <div class="progress-bar progress-bar--sm">
                  <div 
                    class="progress-fill" 
                    :style="{ width: item.progress + '%' }"
                    :class="{'high': item.progress >= 80, 'med': item.progress >= 50 && item.progress < 80}"
                  ></div>
                </div>
                <span class="progress-value">{{ item.progress }}%</span>
              </div>
            </div>
          </div>
        </div>
    </div>
    
    <div v-else class="empty-state">
      <p>Please select a member to view their profile.</p>
    </div>
  </div>
</template>

<style scoped>
.profile-page {
  max-width: 1000px;
  margin: 0 auto;
  padding-bottom: 2rem;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.page-header h1 {
  font-size: 1.5rem;
  font-weight: 600;
  margin: 0;
}

.member-selector {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.select-input {
  padding: 0.5rem;
  border-radius: 6px;
  border: 1px solid var(--border);
  background-color: var(--surface);
  color: var(--text);
}

.profile-dashboard {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.card {
  background-color: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 1.5rem;
}

.card h3 {
  margin-top: 0;
  margin-bottom: 1rem;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text);
}

/* Header Grid */
.profile-header {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.profile-avatar {
  background-color: var(--accent);
  color: white;
  width: 80px;
  height: 80px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  font-weight: 600;
}

.profile-info h2 {
  margin: 0 0 0.25rem 0;
  font-size: 1.5rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.overall-stars {
  font-size: 1.1rem;
  color: #fbbf24;
  letter-spacing: 2px;
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.overall-stars-value {
  font-size: 0.85rem;
  color: var(--text);
  font-weight: 600;
  letter-spacing: 0;
}

.profile-info .role {
  color: var(--text-muted);
  margin: 0 0 0.75rem 0;
}

.links {
  display: flex;
  gap: 1rem;
}

.links a {
  color: var(--accent);
  text-decoration: none;
  font-size: 0.9rem;
}
.links a:hover {
  text-decoration: underline;
}

/* Basic Information */
.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.info-label {
  font-size: 0.75rem;
  text-transform: uppercase;
  color: var(--text-muted);
  font-weight: 500;
}

.info-value {
  font-size: 0.95rem;
  color: var(--text);
}

/* Projects History */
.projects-table {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.project-row {
  display: grid;
  grid-template-columns: 2fr 1.5fr 1.5fr 0.75fr;
  gap: 1rem;
  padding: 0.75rem 0;
  border-bottom: 1px solid var(--border);
  align-items: center;
  font-size: 0.9rem;
}

.project-row:last-child {
  border-bottom: none;
}

.project-header-row {
  font-weight: 600;
  font-size: 0.8rem;
  text-transform: uppercase;
  color: var(--text-muted);
}

.project-name {
  font-weight: 500;
}

.project-role {
  color: var(--text-muted);
}

.project-period {
  font-size: 0.85rem;
  color: var(--text-muted);
}

.project-status {
  display: inline-block;
  padding: 0.2rem 0.5rem;
  border-radius: 99px;
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: capitalize;
  text-align: center;
}

.project-status.active {
  background-color: #dcfce7;
  color: #166534;
}

.project-status.completed {
  background-color: #e0e7ff;
  color: #3730a3;
}

.project-status.on-hold {
  background-color: #fef3c7;
  color: #92400e;
}

/* Dashboard Grid */
.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
}

.stat-row, .eval-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
  font-size: 0.95rem;
}

/* Evaluation */
.eval-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.eval-header h3 {
  margin-bottom: 0;
}

.overall-score {
  display: flex;
  align-items: baseline;
  gap: 0.15rem;
}

.overall-value {
  font-size: 2rem;
  font-weight: 700;
  color: var(--accent);
}

.overall-label {
  font-size: 0.85rem;
  color: var(--text-muted);
}

/* Task Delivery Health (full width) */
.task-health-card {
  margin-bottom: 0;
}

.task-health-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
  margin-bottom: 1.25rem;
}

.task-health-header h3 {
  margin-bottom: 0;
}

.task-health-summary {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.progress-text-inline {
  display: flex;
  align-items: baseline;
  gap: 0.35rem;
  padding: 0.35rem 0.75rem;
  border: 2px solid var(--accent);
  border-radius: 99px;
}

.progress-text-inline.danger {
  border-color: #ef4444;
}

.progress-text-inline .percentage {
  font-size: 1.25rem;
  font-weight: 700;
}

.progress-text-inline .subtext {
  font-size: 0.75rem;
  color: var(--text-muted);
}

.task-health-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
}

.health-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1rem;
  border-radius: 8px;
  gap: 0.25rem;
}

.health-stat-count {
  font-size: 2rem;
  font-weight: 700;
}

.health-stat-label {
  font-size: 0.8rem;
  text-transform: uppercase;
  font-weight: 500;
}

.health-stat.on-track { background: #dcfce7; }
.health-stat.on-track .health-stat-count { color: #166534; }
.health-stat.on-track .health-stat-label { color: #166534; }

.health-stat.overdue { background: #fee2e2; }
.health-stat.overdue .health-stat-count { color: #991b1b; }
.health-stat.overdue .health-stat-label { color: #991b1b; }

.health-stat.done { background: #e0e7ff; }
.health-stat.done .health-stat-count { color: #3730a3; }
.health-stat.done .health-stat-label { color: #3730a3; }

.health-stat.total { background: #f3f4f6; }
.health-stat.total .health-stat-count { color: var(--text); }
.health-stat.total .health-stat-label { color: var(--text-muted); }

.empty-text { color: var(--text-muted); text-align: center; padding: 1rem; }

/* Per-project health table */
.project-health-table {
  margin-top: 1.5rem;
  border-top: 1px solid var(--border);
  padding-top: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.project-group {
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow: hidden;
}

.project-group-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
}

.project-group-name {
  font-weight: 600;
  font-size: 0.95rem;
}

.project-group-stats {
  display: flex;
  gap: 0.75rem;
}

.pg-stat {
  font-size: 0.8rem;
  font-weight: 500;
  padding: 0.2rem 0.5rem;
  border-radius: 99px;
}

.pg-stat.on-track { background: #dcfce7; color: #166534; }
.pg-stat.overdue { background: #fee2e2; color: #991b1b; }
.pg-stat.done { background: #e0e7ff; color: #3730a3; }
.pg-stat.total { background: #f3f4f6; color: var(--text); }

.project-health-title {
  margin: 0 0 0.75rem 0;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text);
}

.project-health-name {
  font-weight: 500;
}

.project-health-status {
  text-transform: capitalize;
  font-size: 0.75rem;
  font-weight: 500;
  padding: 0.15rem 0.4rem;
  border-radius: 4px;
  text-align: center;
}
.project-health-status[data-status="todo"] { background: #f3f4f6; color: #6b7280; }
.project-health-status[data-status="in-progress"] { background: #dbeafe; color: #1d4ed8; }
.project-health-status[data-status="in-review"] { background: #fef3c7; color: #92400e; }
.project-health-status[data-status="done"] { background: #dcfce7; color: #166534; }

.project-health-due {
  font-size: 0.8rem;
  color: var(--text-muted);
}

.project-health-count {
  text-align: center;
  font-weight: 600;
}

.project-health-count.on-track { color: #166534; }
.project-health-count.overdue { color: #991b1b; }
.project-health-count.done { color: #3730a3; }

.row-overdue {
  background-color: #fff5f5;
}

.stars {
  color: #fbbf24;
  letter-spacing: 2px;
  font-size: 1.1rem;
}

.mt-4 {
  margin-top: 1.5rem;
}

.mb-2 {
  margin-bottom: 0.5rem;
}

.badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  background-color: var(--accent-light, #e0e7ff);
  color: var(--accent-dark, #3730a3);
  border-radius: 99px;
  font-size: 0.85rem;
  font-weight: 500;
}

.badge.warning {
  background-color: #fef3c7;
  color: #92400e;
}

/* Progress circle text wrap — kept for RMD */
.progress-circle-wrap {
  display: flex;
  justify-content: center;
  margin: 1.5rem 0;
}

.progress-text {
  background-color: var(--bg);
  border-radius: 50%;
  width: 120px;
  height: 120px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  border: 4px solid var(--accent);
}

.progress-text.danger {
  border-color: #ef4444;
}

.progress-text .percentage {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--text);
}

.progress-text .subtext {
  font-size: 0.75rem;
  color: var(--text-muted);
}

.task-split {
  display: flex;
  justify-content: space-around;
  margin-bottom: 1rem;
}

.split-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
}

.split-count {
  font-size: 1.5rem;
  font-weight: 700;
}

.split-label {
  font-size: 0.75rem;
  color: var(--text-muted);
  text-transform: uppercase;
}

.split-item.on-track .split-count { color: #22c55e; }
.split-item.overdue .split-count { color: #ef4444; }
.split-item.done .split-count { color: var(--accent); }

.summary-text {
  text-align: center;
  font-weight: 500;
  color: #b91c1c; /* red tone */
}

.summary-text.success {
  color: #166534; /* green tone */
}

/* Linear Progress bar */
.progress-bar-wrap {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.progress-bar {
  flex: 1;
  height: 12px;
  background-color: var(--bg);
  border-radius: 6px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background-color: #ef4444; /* low progress is red */
  transition: width 0.3s ease;
}
.progress-fill.med {
  background-color: #eab308;
}
.progress-fill.high {
  background-color: #22c55e;
}

.progress-value {
  font-weight: 600;
  font-size: 0.9rem;
}

/* RMD Details */
.rmd-overall {
  margin-bottom: 1.5rem;
}

.rmd-overall-label {
  font-size: 0.75rem;
  text-transform: uppercase;
  color: var(--text-muted);
  font-weight: 500;
  margin-top: 0.25rem;
  display: block;
}

.rmd-details {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  border-top: 1px solid var(--border);
  padding-top: 1rem;
}

.rmd-detail-row {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.rmd-detail-name {
  font-size: 0.85rem;
  color: var(--text);
  font-weight: 500;
}

.progress-bar--sm {
  height: 8px;
}
</style>