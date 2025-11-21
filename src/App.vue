<template>
  <div class="app-shell">
    <header class="app-header">
      <nav class="main-nav">
        <RouterLink to="/">回忆墙</RouterLink>
        <RouterLink to="/upload">上传回忆</RouterLink>
        <RouterLink to="/timeline">时间轴</RouterLink>
      </nav>
    </header>
    <main>
      <RouterView v-slot="{ Component }">
        <Transition name="page" mode="out-in">
          <component :is="Component" />
        </Transition>
      </RouterView>
    </main>
  </div>
</template>

<style scoped>
.app-shell {
  min-height: 100vh;
  background: transparent;
}

.app-header {
  position: sticky;
  top: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.75rem 1.5rem;
  background: rgba(255, 255, 255, 0.9);
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  z-index: 10;
  backdrop-filter: blur(12px);
}

.main-nav {
  display: flex;
  gap: 1rem;
}

.main-nav a {
  padding: 0.4rem 0.9rem;
  border-radius: 999px;
  background: transparent;
  transition: background 0.2s ease, transform 0.2s ease;
}

.main-nav a.router-link-active {
  background: rgba(244, 177, 131, 0.25);
  transform: translateY(-1px);
  color: #402313;
}

main {
  padding: 2rem clamp(1rem, 3vw, 3rem) 4rem;
}

@media (max-width: 768px) {
  .app-header {
    flex-direction: column;
    gap: 0.5rem;
  }

  main {
    padding: 1rem;
  }

  .main-nav {
    flex-wrap: wrap;
    justify-content: center;
  }
}
</style>

