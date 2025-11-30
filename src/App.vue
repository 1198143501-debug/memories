<script setup>
import { computed } from 'vue'
import { useMemoryStore } from './stores/memoryStore'

const store = useMemoryStore()

const syncStatusText = computed(() => {
  switch (store.syncStatus) {
    case 'syncing':
      return '同步中...'
    case 'synced':
      return '已同步'
    case 'error':
      return '同步失败'
    default:
      return '本地模式'
  }
})
</script>

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
  justify-content: space-between;
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

.status-indicators {
  display: flex;
  align-items: center;
  gap: 1rem;
  font-size: 0.85rem;
}

.sync-status {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.3rem 0.6rem;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.05);
  color: #666;
}

.sync-status.syncing {
  background: rgba(255, 193, 7, 0.1);
  color: #ff9800;
}

.sync-status.synced {
  background: rgba(76, 175, 80, 0.1);
  color: #4caf50;
}

.sync-status.error {
  background: rgba(244, 67, 54, 0.1);
  color: #f44336;
}

.sync-spinner {
  width: 12px;
  height: 12px;
  border: 2px solid #ff9800;
  border-top: 2px solid transparent;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.online-status {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.3rem 0.6rem;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.05);
  color: #666;
}

.online-status.online {
  background: rgba(76, 175, 80, 0.1);
  color: #4caf50;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #ccc;
}

.online-status.online .status-dot {
  background: #4caf50;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

main {
  padding: 2rem clamp(1rem, 3vw, 3rem) 4rem;
}

@media (max-width: 768px) {
  .app-header {
    flex-direction: column;
    gap: 0.5rem;
  }

  .status-indicators {
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

<template>
  <div class="app-shell">
    <header class="app-header">
      <nav class="main-nav">
        <RouterLink to="/">回忆墙</RouterLink>
        <RouterLink to="/upload">上传回忆</RouterLink>
        <RouterLink to="/timeline">时间轴</RouterLink>
      </nav>
      <div class="status-indicators">
        <div class="sync-status" :class="store.syncStatus">
          <span v-if="store.syncStatus === 'syncing'" class="sync-spinner"></span>
          <span v-if="store.syncStatus === 'synced'">✓</span>
          <span v-if="store.syncStatus === 'error'">✗</span>
          {{ syncStatusText }}
        </div>
        <div class="online-status" :class="{ online: store.isOnline }">
          <span class="status-dot"></span>
          {{ store.isOnline ? '在线' : '离线' }}
        </div>
      </div>
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