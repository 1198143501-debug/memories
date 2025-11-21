<template>
  <section class="upload">
    <div class="panel">
      <h2>收藏我的旧时光快乐</h2>
      <form @submit.prevent="handleSubmit">
        <label>
          标题
          <input v-model="title" placeholder="例如：和爷爷抓萤火虫" required />
        </label>
        <label>
          年份
          <input v-model="year" type="number" min="1950" :max="new Date().getFullYear()" required />
        </label>
        <label>
          回忆文字
          <textarea v-model="story" placeholder="想对这段记忆说点什么..." rows="4" required />
        </label>
        <UploadZone @select="handleFile" />

        <div v-if="previewUrl" class="preview">
          <img v-if="isImage" :src="previewUrl" alt="预览" />
          <video v-else :src="previewUrl" controls />
        </div>

        <button type="submit" :disabled="!canSubmit || store.loading">
          {{ store.loading ? '正在珍藏...' : '保存到本地' }}
        </button>
      </form>

    </div>
  </section>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import UploadZone from '../components/UploadZone.vue';
import { useMemoryStore } from '../stores/memoryStore';

const store = useMemoryStore();

const title = ref('');
const year = ref(new Date().getFullYear());
const story = ref('');
const selectedFile = ref(null);
const previewUrl = ref('');

const isImage = computed(() => selectedFile.value?.type.startsWith('image'));

watch(selectedFile, (file, prev) => {
  if (prev && previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value);
    previewUrl.value = '';
  }
  if (file) {
    previewUrl.value = URL.createObjectURL(file);
  }
});

const canSubmit = computed(
  () => title.value && year.value && story.value && selectedFile.value,
);

const handleFile = (file) => {
  selectedFile.value = file;
};

const handleSubmit = async () => {
  if (!canSubmit.value) return;
  const result = await store.addMemory({
    file: selectedFile.value,
    title: title.value,
    year: Number(year.value),
    story: story.value,
  });
  title.value = '';
  story.value = '';
  selectedFile.value = null;
};
</script>

<style scoped>
.upload {
  display: flex;
  justify-content: center;
}

.panel {
  max-width: 600px;
  width: 100%;
  background: var(--card);
  padding: 2rem;
  border-radius: 32px;
  box-shadow: 0 20px 45px var(--shadow);
}

form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

label {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  color: #6c5a4f;
  font-size: 0.95rem;
}

input,
textarea {
  border: none;
  border-radius: 16px;
  padding: 0.9rem 1.1rem;
  background: #fffaf2;
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.05);
  font: inherit;
}

textarea {
  resize: vertical;
}

.preview {
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 15px 30px var(--shadow);
}

.preview img,
.preview video {
  width: 100%;
  display: block;
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

</style>

