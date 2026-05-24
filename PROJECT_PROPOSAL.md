# Project Management System — Client Proposal

> **Rate:** $1,500/month | 20hrs/week | ~$18.75/hr effective  
> **Engagement Type:** Part-time  
> **Deliverable (Phase 0):** POC / Proof of Concept  
> **Full Product:** Web App + Desktop App (Electron/Tauri)

---

## 1. Full Product Requirements (All Features)

### 1.1 Task Management
- Create, edit, delete, archive tasks
- Task assignment (single or multi-assignee)
- Priority levels: Low / Medium / High / Critical
- Status workflow: To Do → In Progress → In Review → Done
- Labels, tags, and categories
- Due dates, reminders, and recurring tasks
- Subtasks and task dependencies
- Task comments, attachments, and activity log
- Views: Kanban board, List, Calendar, Gantt chart
- Search, filter, and bulk actions

### 1.2 Time Tracking
- Start / Stop timer per task
- Manual time entry and editing
- Billable vs non-billable hours
- Time logs per employee per day/week
- Manager approval workflow for logged time
- Export timesheets (CSV / PDF)
- Time reports: daily, weekly, monthly breakdowns

### 1.3 Employee Evaluation & Productivity
- Periodic performance reviews (1:1, quarterly, annual)
- KPI definitions and scoring per role
- Automated productivity score (tasks completed, on-time rate, hours)
- Goal setting and progress tracking (OKRs)
- 360-degree peer feedback
- Employee performance history and trends
- Skill matrix and competency tracking

### 1.4 Client Management & Specifications
- Client profiles (contact info, timezone, industry)
- Project–client linking
- Client requirement specs (document upload + rich text)
- Version history for client specs/requirements
- Client communication log
- Read-only client portal (view project status, milestones, invoices)
- Client satisfaction rating per project

### 1.5 Project Management
- Project creation with start/end dates and budget
- Team assignment and role definition per project
- Milestones and deliverable tracking
- Budget vs actual cost tracking
- Risk and issue log
- Document management per project
- Project templates

### 1.6 Insights & Analytics
- Executive dashboard (projects health, team utilization)
- Employee performance dashboard (individual + team)
- Time utilization and overtime reports
- Project progress vs timeline comparison
- Client project ROI insights
- Workload distribution heatmap
- Exportable reports (PDF / Excel)

### 1.7 System & Administration
- Role-based access control (Admin, Manager, Employee, Client)
- Notifications (in-app, email)
- Audit log
- Multi-language support (EN / AR)
- Dark / Light theme
- Desktop app (Electron or Tauri) — offline-capable sync

---

## 2. POC Scope (MVP to Demonstrate Concept)

> Goal: Show the **core workflow end-to-end** with real data and working UI.  
> No need for full polish, mobile-responsiveness, or desktop wrapper at this stage.

### POC Modules

| # | Module | What's Included |
|---|--------|----------------|
| 0 | **Design** | Wireframes + component design for 2 screens (Figma) |
| 1 | **Task Management** | CRUD tasks, assignment, status, priority, Kanban board — start timer directly from a task card |
| 2 | **Time Tracking** | Start/stop timer (from Kanban or this screen), manual entry, timesheet log |

### POC Explicitly Excluded (Deferred to Full Product)
- Login / Auth / Roles
- Employee Overview
- Client & Project management
- Dashboard & Analytics
- Desktop app packaging
- Client portal
- Performance reviews / OKRs / 360 feedback
- Budget tracking
- Gantt chart
- Notifications / email
- Export reports
- Audit log
- Multi-language

---

## 3. POC Time Estimate

> Base rate: **$18.75/hr** (~$1,500 / 80hrs per month)

### Phase 0 — Design (Figma Wireframes)
| Task | Hours | Cost |
|------|-------|------|
| Design system setup (colors, typography, components) | 2 | $38 |
| Kanban board wireframe (with timer trigger on card) | 3 | $56 |
| Time Tracking / Timesheet screen wireframe | 2 | $38 |
| Design review & revisions (1 round) | 1 | $19 |
| **Phase 0 Subtotal** | **8 hrs** | **~$150** |

### Phase 1 — Backend (NestJS + PostgreSQL)
| Task | Hours | Cost |
|------|-------|------|
| Project setup — Prisma schema, DB migrations | 3 | $56 |
| Tasks module — CRUD, status, priority, assignment | 4 | $75 |
| Time entries module — start/stop, active entry check, manual entry, logs | 4 | $75 |
| **Phase 1 Subtotal** | **11 hrs** | **~$206** |

### Phase 2 — Frontend (React + TypeScript)
| Task | Hours | Cost |
|------|-------|------|
| Project setup — Vite, Tailwind, routing, API client | 3 | $56 |
| Task Management — Kanban board + drag & drop + task detail modal + timer button on card | 10 | $188 |
| Time Tracking — timer UI (start from Kanban or this screen), manual entry, timesheet table | 7 | $131 |
| **Phase 2 Subtotal** | **20 hrs** | **~$375** |

### Phase 3 — QA & Demo Prep
| Task | Hours | Cost |
|------|-------|------|
| Seed realistic demo data | 1 | $19 |
| Bug fixes & cross-browser check | 3 | $56 |
| Demo walkthrough script + final polish | 2 | $38 |
| **Phase 3 Subtotal** | **6 hrs** | **~$113** |

---

### Total POC Estimate
| Phase | Hours | Cost |
|-------|-------|------|
| Phase 0 — Design | 8 | ~$150 |
| Phase 1 — Backend | 11 | ~$206 |
| Phase 2 — Frontend | 20 | ~$375 |
| Phase 3 — QA & Demo | 6 | ~$113 |
| **TOTAL** | **45 hrs** | **~$844** |

### Timeline
| Week | Focus |
|------|-------|
| Week 1 | Design (Figma) + Backend setup + Tasks API |
| Week 2 | Time Tracking API + Frontend setup + Kanban board |
| Week 3 | Time Tracking UI + Timesheet + Seed data + QA + Demo prep |

**Estimated Duration: ~3 weeks**  
**Estimated Cost: ~$844** *(~$1,125 if padded for revision rounds)*

---

## 4. Suggested Tech Stack

| Layer | Technology | Reason |
|-------|-----------|--------|
| Frontend | React + TypeScript + Vite | Fast dev, reusable for desktop wrapper |
| UI Library | shadcn/ui + Tailwind CSS | Clean, modern, easy to customize |
| State Management | Zustand or TanStack Query | Lightweight, fits POC scope |
| Backend | NestJS + TypeScript | Scalable, matches team's existing stack |
| Database | PostgreSQL + Prisma ORM | Relational data fits this domain perfectly |
| Auth | JWT + bcrypt | Simple, secure for POC |
| Charts | Recharts | React-native, sufficient for POC |
| Desktop (Phase 2) | Tauri (wraps the web app) | Lighter than Electron, Rust-based |

---

## 5. Full Product Estimate (High-Level, Post-POC)

| Phase | Scope | Estimated Duration | Estimated Cost |
|-------|-------|--------------------|----------------|
| Phase 0 | POC (above) | 6 weeks | ~$2,250 |
| Phase 1 | Full task, time, project management | 3–4 months | ~$4,500–$6,000 |
| Phase 2 | Evaluations, OKRs, client portal, reports | 2–3 months | ~$3,000–$4,500 |
| Phase 3 | Desktop app, offline sync, notifications | 2 months | ~$3,000 |
| **Total** | **Full Product** | **~10–12 months** | **~$12,750–$15,750** |

---

## 6. Notes & Assumptions
- All estimates are part-time (20hrs/week).
- POC uses seed/mock data; no production deployment or DevOps included.
- Design mockups/wireframes are not included (if needed, add ~8hrs).
- Significant scope changes may require re-estimation.
- After POC approval, a detailed sprint plan will be provided for Phase 1.
