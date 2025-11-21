<template>
<article
  class="memory-card"
  @mouseenter="hovering = true"
  @mouseleave="hovering = false"
  @click="goDetail"
>
    <div class="media">
      <img v-if="memory.mediaType === 'image'" :src="memory.mediaUrl" :alt="memory.title" loading="lazy" />
      <video
        v-else
        :src="memory.mediaUrl"
        preload="metadata"
        muted
        playsinline
        @mouseenter="$event.target.play()"
        @mouseleave="$event.target.pause()"
      />
      <div class="overlay" />
    </div>
    <div class="content">
      <h3>{{ memory.title }}</h3>
      <p class="year">{{ memory.year }} · {{ new Date(memory.createdAt).toLocaleDateString() }}</p>
      <p class="story">{{ memory.story }}</p>
      <div class="actions">
        <button class="like" :class="{ active: liked }" @click.stop="handleLike">
          {{ liked ? '❤️ 已喜欢' : '🤍 喜欢' }} · {{ memory.likes }}
        </button>
        <RouterLink class="share" :to="{ name: 'detail', params: { id: memory.id } }">
          查看
        </RouterLink>
        <button class="danger" @click.stop="handleDelete">删除</button>
      </div>
    </div>
  </article>
</template>

<script setup>
import { computed, ref } from 'vue';
import { useMemoryStore } from '../stores/memoryStore';

const props = defineProps({
  memory: {
    type: Object,
    required: true,
  },
});

const hovering = ref(false);
const store = useMemoryStore();
const liked = computed(() => store.isLiked(props.memory.id));

const goDetail = () => {
  window.location.hash = `#/detail/${props.memory.id}`;
};

const handleLike = async () => {
  await store.likeMemory(props.memory.id);
};

const handleDelete = async () => {
  const confirmed = window.confirm('确定删除这段时光吗？操作不可撤销。');
  if (!confirmed) return;
  await store.deleteMemory(props.memory.id);
};
</script>

<style scoped>
.memory-card {
  break-inside: avoid;
  background: #fff;
  border-radius: 24px;
  box-shadow: 0 18px 40px rgba(18, 23, 38, 0.08);
  margin-bottom: 1.5rem;
  overflow: hidden;
  cursor: pointer;
  display: grid;
  grid-template-rows: 3fr 1fr;
  height: clamp(360px, 78vw, 520px);
  transform: translateY(0);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.memory-card:hover {
  transform: translateY(-6px);
  box-shadow: 0 20px 45px rgba(75, 63, 53, 0.25);
}

.media {
  position: relative;
  overflow: hidden;
}

img,
video {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
}

.overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, transparent, rgba(0, 0, 0, 0.4));
  opacity: 0;
  transition: opacity 0.3s ease;
}

.memory-card:hover .overlay {
  opacity: 1;
}

.content {
  padding: 0.9rem 1.1rem 1.1rem;
  background: #fff;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

h3 {
  margin: 0 0 0.25rem;
  font-size: 1.2rem;
}

.year {
  margin: 0;
  font-size: 0.85rem;
  color: #807a86;
}

.story {
  margin: 0.4rem 0 0.6rem;
  color: #615b68;
  flex: 1;
}

.actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.actions button,
.actions .share {
  font-size: 0.8rem;
  padding: 0.35rem 0.8rem;
  border-radius: 999px;
}

.like {
  background: rgba(244, 177, 131, 0.18);
  color: #d26e45;
  box-shadow: none;
}

.like.active {
  background: rgba(244, 177, 131, 0.35);
}

.share {
  padding: 0.35rem 0.85rem;
  background: #f7f7f9;
  border-radius: 999px;
  color: #2c2b32;
  box-shadow: none;
}

.danger {
  background: rgba(0, 0, 0, 0.05);
  color: #a33f3f;
  box-shadow: none;
}

@media (max-width: 640px) {
  .memory-card {
    margin-bottom: 0;
    width: 100%;
    height: clamp(320px, 95vw, 420px);
  }

  .media {
    max-height: none;
  }
}
</style>

