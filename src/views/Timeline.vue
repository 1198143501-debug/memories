<template>
  <section class="timeline-page">
    <header class="hero">
      <h1>旧时光时间轴</h1>
      <p>把那些旧时光里的快乐时刻排成一条线，随时回望心里那束柔光。</p>
      <div class="actions">
        <RouterLink to="/">
          <button class="ghost">回忆墙</button>
        </RouterLink>
        <RouterLink to="/upload">
          <button>继续上传</button>
        </RouterLink>
      </div>
    </header>

    <div v-if="!store.initialized" class="state">正在整理时间线...</div>

    <div v-else-if="!years.length" class="state">
      <p>还没有任何记录，先去上传你的第一条吧！</p>
      <RouterLink to="/upload"><button>马上上传</button></RouterLink>
    </div>

    <div v-else ref="timelineRef" class="timeline">
      <div v-for="group in grouped" :key="group.year" class="year-block">
        <div class="year-node">
          <span class="year">{{ group.year }}</span>
          <small>{{ group.items.length }} 条回忆</small>
        </div>
        <div class="entries">
          <article v-for="memory in group.items" :key="memory.id" class="entry" @click="openDetail(memory.id)">
            <p class="date">{{ formatDate(memory.createdAt) }}</p>
            <h3>{{ memory.title }}</h3>
            <p class="text">{{ memory.story }}</p>
            <div class="chips">
              <span>{{ memory.mediaType === 'video' ? '视频' : '图片' }}</span>
              <span>❤️ {{ memory.likes }}</span>
            </div>
          </article>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { gsap } from 'gsap';
import { useMemoryStore } from '../stores/memoryStore';

const store = useMemoryStore();
const router = useRouter();

const timelineRef = ref(null);

const grouped = computed(() => store.groupedByYear);
const years = computed(() => store.years);

const formatDate = (time) =>
  new Date(time).toLocaleDateString('zh-CN', {
    month: 'long',
    day: 'numeric',
  });

const animateTimeline = () => {
  if (!timelineRef.value) return;
  const blocks = timelineRef.value.querySelectorAll('.year-block');
  if (!blocks.length) return;
  gsap.from(blocks, {
    opacity: 0,
    y: 30,
    duration: 0.8,
    stagger: 0.15,
    ease: 'power3.out',
  });
};

const ensureData = async () => {
  if (!store.initialized) {
    await store.loadMemories();
  }
  await nextTick();
  animateTimeline();
};

const openDetail = (id) => {
  router.push({ name: 'detail', params: { id } });
};

onMounted(ensureData);
watch(grouped, async () => {
  await nextTick();
  animateTimeline();
});
</script>

<style scoped>
.timeline-page {
  max-width: 1100px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.hero {
  background: var(--card);
  border-radius: 32px;
  padding: 2rem;
  box-shadow: 0 20px 45px var(--shadow);
}

.hero p {
  margin-top: 0.4rem;
  color: #6f5a4f;
}

.actions {
  margin-top: 1.25rem;
  display: flex;
  gap: 0.8rem;
  flex-wrap: wrap;
}

.ghost {
  background: rgba(244, 177, 131, 0.15);
  color: var(--accent-dark);
  box-shadow: none;
}

.timeline {
  position: relative;
  padding-left: 1.5rem;
}

.timeline::before {
  content: '';
  position: absolute;
  inset: 0 auto 0 10px;
  width: 4px;
  background: linear-gradient(180deg, rgba(244, 177, 131, 0.3), rgba(212, 130, 101, 0.6));
  border-radius: 999px;
}

.year-block {
  position: relative;
  padding-left: 2rem;
  margin-bottom: 2.5rem;
}

.year-node {
  display: inline-flex;
  flex-direction: column;
  background: #fff7ee;
  border-radius: 16px;
  padding: 0.5rem 1rem;
  box-shadow: 0 10px 25px var(--shadow);
}

.year-node .year {
  font-size: 1.4rem;
  font-weight: 700;
}

.entries {
  margin-top: 1rem;
  display: grid;
  gap: 1rem;
}

.entry {
  background: var(--card);
  border-radius: 24px;
  padding: 1.2rem 1.4rem;
  box-shadow: 0 12px 30px var(--shadow);
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.entry:hover {
  transform: translateX(6px);
  box-shadow: 0 18px 35px rgba(75, 63, 53, 0.2);
}

.date {
  margin: 0;
  color: #9a8576;
  font-size: 0.9rem;
}

.text {
  margin: 0.6rem 0 0.8rem;
  color: #5c5046;
}

.chips {
  display: flex;
  gap: 0.6rem;
  flex-wrap: wrap;
  font-size: 0.8rem;
  color: #a67c68;
}

.chips span {
  background: rgba(244, 177, 131, 0.15);
  padding: 0.2rem 0.6rem;
  border-radius: 999px;
}

.state {
  text-align: center;
  color: #6c5a4f;
  padding: 3rem 0;
}

.state button {
  margin-top: 1rem;
}

@media (max-width: 640px) {
  .timeline::before {
    left: 4px;
  }

  .year-block {
    padding-left: 1rem;
  }
}
</style>

