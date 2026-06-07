<template>
  <section>
    <div class="page-header">
      <div>
        <h2 class="page-title">Projects</h2>
        <p class="page-subtitle">Manage projects, assign team members, and open Kanban boards per project.</p>
      </div>
      <button class="button button--compact" @click="openDialog()">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        New Project
      </button>
    </div>

    <div class="projects-grid">
      <article v-for="project in projects" :key="project.id" class="project-card">
        <div class="project-card-header">
          <div class="project-card-header-left">
            <h3 class="project-card-title">{{ project.name }}</h3>
            <span :class="['status-chip', 'status-chip--' + project.status]">{{ statusLabels[project.status] }}</span>
          </div>
          <div class="dropdown">
            <button class="icon-btn icon-btn--subtle" @click="toggleDropdown(project.id)">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="5" r="2" />
                <circle cx="12" cy="12" r="2" />
                <circle cx="12" cy="19" r="2" />
              </svg>
            </button>
            <div v-if="openDropdownId === project.id" class="dropdown-menu">
              <button class="dropdown-item" @click="openDialog(project); closeDropdown()">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                Edit
              </button>
              <button class="dropdown-item dropdown-item--danger" @click="handleDelete(project); closeDropdown()">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6l-2 14H7L5 6" />
                  <path d="M10 11v6" />
                  <path d="M14 11v6" />
                  <path d="M9 6V4h6v2" />
                </svg>
                Delete
              </button>
            </div>
          </div>
        </div>

        <p v-if="project.description" class="project-card-desc">{{ project.description }}</p>

        <div v-if="project.clientName" class="project-card-meta">
          <span class="meta-label">Client:</span> {{ project.clientName }}
        </div>

        <div class="project-card-meta">
          <span class="meta-label">Period:</span>
          {{ project.startDate ? formatDate(project.startDate) : '—' }}
          → {{ project.endDate ? formatDate(project.endDate) : 'Ongoing' }}
        </div>

        <div class="project-card-members">
          <div class="assignees-stack">
            <span v-for="m in getProjectMembers(project)" :key="m.id" class="avatar" :title="m.name">{{
              m.initials }}</span>
          </div>
          <span class="meta-label">{{ project.memberIds.length }} members</span>
        </div>

        <div class="project-card-stats">
          <span class="stat-pill">{{ getProjectTaskCount(project.id) }} tasks</span>
          <span class="stat-pill stat-pill--done">{{ getProjectDoneCount(project.id) }} done</span>
        </div>

        <div class="project-card-actions">
          <NuxtLink :to="`/?project=${project.id}`" class="button button--compact button--primary">
            Open Board
          </NuxtLink>
        </div>
      </article>
    </div>

    <!-- Create/Edit Dialog -->
    <div v-if="showDialog" class="dialog-overlay" @click.self="closeDialog">
      <div class="dialog">
        <h3 class="dialog-title">{{ editingProject ? 'Edit Project' : 'New Project' }}</h3>

        <div class="dialog-body">
          <div class="field">
            <label for="proj-name">Project Name *</label>
            <input id="proj-name" v-model="form.name" placeholder="e.g. King Abdullah Financial District" />
          </div>

          <div class="field">
            <label for="proj-desc">Description</label>
            <textarea id="proj-desc" v-model="form.description" rows="3"
              placeholder="Brief project description"></textarea>
          </div>

          <div class="field-row">
            <div class="field">
              <label for="proj-client">Client</label>
              <input id="proj-client" v-model="form.clientName" placeholder="Client name" />
            </div>
            <div class="field">
              <label for="proj-status">Status</label>
              <select id="proj-status" v-model="form.status">
                <option value="active">Active</option>
                <option value="on-hold">On Hold</option>
                <option value="completed">Completed</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>

          <div class="field-row">
            <div class="field">
              <label for="proj-start">Start Date</label>
              <input id="proj-start" type="date" v-model="form.startDate" />
            </div>
            <div class="field">
              <label for="proj-end">End Date</label>
              <input id="proj-end" type="date" v-model="form.endDate" />
            </div>
          </div>

          <div class="field">
            <label>Assign Members</label>
            <div class="members-checklist">
              <label v-for="member in members" :key="member.id" class="member-check-item">
                <input type="checkbox" :value="member.id" v-model="form.memberIds" />
                <span class="avatar avatar--sm">{{ member.initials }}</span>
                <span>{{ member.name }}</span>
                <span class="meta-label">{{ member.role }}</span>
              </label>
            </div>
          </div>
        </div>

        <div class="dialog-actions">
          <button class="button button--ghost" @click="closeDialog">Cancel</button>
          <button class="button button--compact button--primary" :disabled="!form.name.trim()" @click="handleSave">
            {{ editingProject ? 'Update' : 'Create' }}
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { usePocStore } from '~/composables/usePocStore'
import type { Project, ProjectStatus } from '~/composables/usePocStore'

const store = usePocStore()
const { projects, members, tasks } = store

const statusLabels: Record<ProjectStatus, string> = {
  active: 'Active',
  'on-hold': 'On Hold',
  completed: 'Completed',
  archived: 'Archived',
}

const showDialog = ref(false)
const editingProject = ref<Project | null>(null)
const openDropdownId = ref<string | null>(null)

const toggleDropdown = (id: string) => {
  openDropdownId.value = openDropdownId.value === id ? null : id
}
const closeDropdown = () => {
  openDropdownId.value = null
}

const emptyForm = () => ({
  name: '',
  description: '',
  status: 'active' as ProjectStatus,
  clientName: '',
  startDate: '',
  endDate: '',
  memberIds: [] as string[],
})

const form = ref(emptyForm())

onMounted(() => {
  store.loadAll()
  document.addEventListener('click', handleClickOutside)
})

const handleClickOutside = (e: Event) => {
  const target = e.target as HTMLElement
  if (!target.closest('.dropdown')) {
    openDropdownId.value = null
  }
}

const getProjectMembers = (project: Project) => {
  return members.value.filter((m) => project.memberIds.includes(m.id))
}

const getProjectTaskCount = (projectId: string) => {
  return tasks.value.filter((t) => t.projectId === projectId).length
}

const getProjectDoneCount = (projectId: string) => {
  return tasks.value.filter((t) => t.projectId === projectId && t.status === 'done').length
}

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

const openDialog = (project?: Project) => {
  if (project) {
    editingProject.value = project
    form.value = {
      name: project.name,
      description: project.description,
      status: project.status,
      clientName: project.clientName ?? '',
      startDate: project.startDate ?? '',
      endDate: project.endDate ?? '',
      memberIds: [...project.memberIds],
    }
  } else {
    editingProject.value = null
    form.value = emptyForm()
  }
  showDialog.value = true
}

const closeDialog = () => {
  showDialog.value = false
  editingProject.value = null
}

const handleSave = async () => {
  if (!form.value.name.trim()) return
  if (editingProject.value) {
    await store.updateProject({
      ...editingProject.value,
      ...form.value,
    })
  } else {
    await store.createProject(form.value)
  }
  closeDialog()
}

const handleDelete = async (project: Project) => {
  if (!confirm(`Delete project "${project.name}"? Tasks will become unassigned.`)) return
  await store.deleteProject(project.id)
}
</script>

<style scoped>
.projects-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  gap: 20px;
  margin-top: 24px;
}

.project-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.project-card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.project-card-header-left {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  flex: 1;
  min-width: 0;
}

.dropdown {
  position: relative;
}

.icon-btn--subtle {
  background: none;
  border: none;
  padding: 4px;
  border-radius: 6px;
  cursor: pointer;
  color: var(--muted);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s, color 0.15s;
}

.icon-btn--subtle:hover {
  background: var(--surface-strong);
  color: var(--text);
}

.dropdown-menu {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 4px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  min-width: 140px;
  padding: 4px;
  z-index: 50;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 12px;
  border: none;
  background: none;
  border-radius: 6px;
  font-size: 0.85rem;
  cursor: pointer;
  color: var(--text);
  transition: background 0.15s;
}

.dropdown-item:hover {
  background: var(--surface-strong);
}

.dropdown-item--danger {
  color: var(--danger);
}

.dropdown-item--danger:hover {
  background: #fef2f2;
}

.project-card-title {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 600;
}

.project-card-desc {
  margin: 0;
  font-size: 0.87rem;
  color: var(--muted);
  line-height: 1.4;
}

.project-card-meta {
  font-size: 0.82rem;
  color: var(--muted);
}

.meta-label {
  font-weight: 500;
  color: var(--muted);
  font-size: 0.8rem;
}

.project-card-members {
  display: flex;
  align-items: center;
  gap: 10px;
}

.project-card-stats {
  display: flex;
  gap: 8px;
}

.stat-pill {
  font-size: 0.75rem;
  padding: 3px 9px;
  background: var(--surface-strong);
  border-radius: 20px;
  color: var(--muted);
  font-weight: 500;
}

.stat-pill--done {
  background: #dcfce7;
  color: var(--success);
}

.project-card-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: auto;
  padding-top: 12px;
  border-top: 1px solid var(--border);
}

.project-card-actions .button--primary {
  width: 100%;
}

.status-chip--active {
  background: #dcfce7;
  color: var(--success);
}
.status-chip--on-hold {
  background: #fef3c7;
  color: var(--warning);
}
.status-chip--completed {
  background: #e0e7ff;
  color: var(--accent);
}
.status-chip--archived {
  background: var(--surface-strong);
  color: var(--muted);
}

.members-checklist {
  display: grid;
  gap: 6px;
  max-height: 240px;
  overflow-y: auto;
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 10px;
}

.member-check-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 4px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.87rem;
}

.member-check-item:hover {
  background: var(--surface-strong);
}

.member-check-item input[type="checkbox"] {
  width: 16px;
  height: 16px;
  accent-color: var(--accent);
}

.field-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.dialog-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.4);
  display: grid;
  place-items: center;
  z-index: 100;
}

.dialog {
  width: min(80%, calc(100% - 32px));
  max-height: calc(100vh - 64px);
  overflow-y: auto;
  background: var(--surface);
  border-radius: 20px;
  padding: 28px;
  border: 1px solid var(--border);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
}

.dialog-title {
  margin: 0 0 20px;
  font-size: 1.25rem;
  font-weight: 700;
}

.dialog-body {
  margin-bottom: 20px;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding-top: 16px;
  border-top: 1px solid var(--border);
}

.button--ghost {
  background: none;
  border: 1px solid var(--border);
  color: var(--text);
}

.button--ghost:hover {
  background: var(--surface-strong);
}

.button--compact {
  padding: 10px 16px;
  font-size: 0.88rem;
}

.button--primary {
  background: var(--accent);
  color: #fff;
}
</style>
