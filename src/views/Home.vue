<template>
  <section class="home">
    <header class="hero">
      <div>
      
        <p>把旧物与光影里的快乐瞬间收集在此，与在乎的人共享那份温度。</p>
      </div>
      <div class="sort">
        <button :class="{ active: sortMode === 'time' }" @click="setSort('time')">最新</button>
        <button :class="{ active: sortMode === 'heat' }" @click="setSort('heat')">热度</button>
      </div>
    </header>

    <div v-if="!store.initialized" class="loading">正在唤醒回忆...</div>

    <div v-else-if="memories.length === 0" class="empty">
      <p>这里还空着，把你的第一份旧时光快乐上传进来吧！</p>
      <RouterLink to="/upload"><button>马上上传</button></RouterLink>
    </div>

    <div v-else class="masonry">
      <MemoryCard v-for="memory in memories" :key="memory.id" :memory="memory" />
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted } from 'vue';
import { useMemoryStore } from '../stores/memoryStore';
import MemoryCard from '../components/MemoryCard.vue';

const store = useMemoryStore();

onMounted(() => {
  store.loadMemories();
});

const memories = computed(() => store.sortedMemories);
const sortMode = computed(() => store.sortMode);

const setSort = (mode) => {
  store.sortMode = mode;
};
</script>

<style scoped>
.home {
  max-width: 1200px;
  margin: 0 auto;
}

.hero {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  margin-bottom: 2rem;
}

.hero h1 {
  margin: 0;
  font-size: clamp(1.5rem, 4vw, 2.8rem);
}

.sort button {
  background: rgba(0, 0, 0, 0.05);
  color: #6c5a4f;
  margin-left: 0.5rem;
}

.sort button.active {
  background: var(--accent);
  color: white;
}

.masonry {
  column-count: 3;
  column-gap: 1.25rem;
}

@media (max-width: 1024px) {
  .masonry {
    column-count: 2;
  }
}

@media (max-width: 640px) {
  .hero {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .masonry {
    column-count: initial;
    column-gap: 0;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.9rem;
  }
}

@media (max-width: 430px) {
  .masonry {
    gap: 0.75rem;
  }
}

.loading,
.empty {
  text-align: center;
  color: #6c5a4f;
  padding: 4rem 0;
}
</style>

