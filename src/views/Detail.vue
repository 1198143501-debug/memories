<template>
  <section v-if="!loading && memory" class="detail">
    <div class="media" :class="memory.mediaType">
      <img v-if="memory.mediaType === 'image'" :src="memory.mediaUrl" :alt="memory.title" />
      <video v-else :src="memory.mediaUrl" controls playsinline></video>
    </div>

    <div class="info">
      <RouterLink to="/" class="back">← 返回回忆墙</RouterLink>
      <p class="meta">{{ memory.year }} 年 · {{ formattedDate }}</p>
      <h1>{{ memory.title }}</h1>
      <p class="story">{{ memory.story }}</p>

      <div class="actions">
        <button :class="{ active: liked }" @click="handleLike">
          {{ liked ? '❤️ 已喜欢' : '🤍 喜欢' }} · {{ memory.likes }}
        </button>
        <RouterLink to="/timeline">
          <button class="ghost">查看时间轴</button>
        </RouterLink>
        <button class="danger" :disabled="deleting" @click="handleDelete">
          {{ deleting ? '删除中...' : '删除这段回忆' }}
        </button>
      </div>
      <section class="comments">
        <h2>留言墙</h2>
        <form class="comment-form" @submit.prevent="handleSubmitComment">
          <textarea
            v-model="commentContent"
            placeholder="分享你此刻的心情或记忆片段..."
            rows="3"
            required
          />
          <button type="submit" :disabled="submittingComment || !commentContent.trim()">
            {{ submittingComment ? '发送中...' : '写下心声' }}
          </button>
        </form>

        <p v-if="!comments.length" class="empty-comment">还没有留言，写下第一句祝福吧。</p>
        <ul v-else class="comment-list">
          <li v-for="comment in comments" :key="comment.id">
            <header>
              <strong>{{ comment.author || '匿名' }}</strong>
              <span>{{ formatCommentDate(comment.createdAt) }}</span>
            </header>
            <p>{{ comment.content }}</p>
          </li>
        </ul>
      </section>
    </div>
  </section>

  <section v-else class="state">
    <div v-if="loading">正在打开这段回忆...</div>
    <div v-else>
      <p>{{ error || '没有找到这段记忆' }}</p>
      <RouterLink to="/upload">
        <button>去上传我的回忆</button>
      </RouterLink>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useMemoryStore } from '../stores/memoryStore';

const route = useRoute();
const router = useRouter();
const store = useMemoryStore();

const loading = ref(true);
const error = ref('');
const memory = ref(null);
const deleting = ref(false);
const commentContent = ref('');
const submittingComment = ref(false);

const formattedDate = computed(() => {
  if (!memory.value?.createdAt) return '';
  return new Date(memory.value.createdAt).toLocaleString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
});

const liked = computed(() => (memory.value ? store.isLiked(memory.value.id) : false));
const comments = computed(() => memory.value?.comments ?? []);

const fetchMemory = async () => {
  loading.value = true;
  error.value = '';
  try {
    if (!store.initialized) {
      await store.loadMemories();
    }

    memory.value = store.getMemoryById(route.params.id);
    if (!memory.value) {
      error.value = '没有找到对应的回忆，试试返回首页刷新列表';
    }
  } finally {
    loading.value = false;
  }
};

const handleLike = async () => {
  if (!memory.value) return;
  await store.likeMemory(memory.value.id);
};

const handleSubmitComment = async () => {
  if (!memory.value || submittingComment.value) return;
  const trimmed = commentContent.value.trim();
  if (!trimmed) return;
  submittingComment.value = true;
  try {
    await store.addComment(memory.value.id, {
      author: '',
      content: trimmed,
    });
    commentContent.value = '';
  } finally {
    submittingComment.value = false;
  }
};

const formatCommentDate = (time) =>
  new Date(time).toLocaleString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

const handleDelete = async () => {
  if (!memory.value || deleting.value) return;
  const confirmed = window.confirm('确定删除这段旧时光吗？操作不可撤销。');
  if (!confirmed) return;
  deleting.value = true;
  try {
    await store.deleteMemory(memory.value.id);
    router.push('/');
  } finally {
    deleting.value = false;
  }
};

onMounted(fetchMemory);
watch(
  () => route.fullPath,
  () => {
    fetchMemory();
  },
);
</script>

<style scoped>
.detail {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(0, 0.9fr);
  gap: 2.5rem;
  max-width: 1200px;
  margin: 0 auto;
  align-items: start;
}

.media {
  border-radius: 36px;
  overflow: hidden;
  background: rgba(0, 0, 0, 0.05);
  box-shadow: 0 30px 60px var(--shadow);
}

.media img,
.media video {
  width: 100%;
  display: block;
  object-fit: cover;
}

.info {
  background: var(--card);
  border-radius: 32px;
  padding: 2rem;
  box-shadow: 0 15px 40px var(--shadow);
}

.meta {
  margin: 0;
  color: #8d7764;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

h1 {
  margin: 0.3rem 0 1rem;
  font-size: clamp(1.8rem, 4vw, 2.8rem);
}

.story {
  color: #5b4a41;
  line-height: 1.7;
  margin-bottom: 1.5rem;
}

.actions {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.ghost {
  background: rgba(244, 177, 131, 0.18);
  color: var(--accent-dark);
  box-shadow: none;
}

.actions button.active {
  background: rgba(244, 177, 131, 0.35);
  color: var(--accent-dark);
}

.danger {
  background: rgba(217, 83, 79, 0.2);
  color: #c0392b;
  box-shadow: none;
}

.comments {
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 1px solid rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.comments h2 {
  margin: 0;
  font-size: 1.2rem;
  color: #5b4a41;
}

.comment-form {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

.comment-form textarea {
  border: none;
  border-radius: 18px;
  padding: 0.85rem 1rem;
  background: #fffaf2;
  font: inherit;
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.05);
}

.comment-form textarea {
  resize: vertical;
}

.empty-comment {
  margin: 0;
  color: #a18c7b;
}

.comment-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

.comment-list li {
  background: #fffaf4;
  border-radius: 18px;
  padding: 0.9rem 1rem;
  box-shadow: 0 8px 20px var(--shadow);
}

.comment-list header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 0.5rem;
  color: #8a7563;
  font-size: 0.9rem;
}

.comment-list p {
  margin: 0.6rem 0 0;
  color: #53453c;
  white-space: pre-line;
}

.back {
  display: inline-block;
  margin-bottom: 1.25rem;
  color: var(--accent-dark);
  font-weight: 600;
}

.state {
  text-align: center;
  padding: 4rem 0;
  color: #6c5a4f;
}

.state button {
  margin-top: 1rem;
}

@media (max-width: 960px) {
  .detail {
    grid-template-columns: 1fr;
  }

  .media {
    order: 2;
  }

  .info {
    order: 1;
  }
}
</style>

