<template>
  <div class="app-shell">
    <aside class="sidebar">
      <div class="brand">BIM WOW</div>
      <p class="sidebar-copy">POC task management + time tracking</p>
      <nav class="nav-list">
        <NuxtLink to="/" class="nav-link" exact-active-class="active">Kanban board</NuxtLink>
        <NuxtLink to="/time-tracking" class="nav-link" active-class="active">Time tracking</NuxtLink>
      </nav>
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
