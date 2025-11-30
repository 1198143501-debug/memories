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

        <div v-if="errorMessage" class="error-message">
          {{ errorMessage }}
        </div>

        <button type="submit" :disabled="!canSubmit || store.loading || isSubmitting">
          <span v-if="isSubmitting" class="submit-spinner"></span>
          <span v-else>{{ store.loading ? '正在上传...' : '保存回忆' }}</span>
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
const errorMessage = ref('');
const isSubmitting = ref(false);

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
  errorMessage.value = '';
};

const handleSubmit = async () => {
  if (!canSubmit.value || isSubmitting.value) return;
  
  try {
    isSubmitting.value = true;
    errorMessage.value = '';
    
    const result = await store.addMemory({
      file: selectedFile.value,
      title: title.value,
      year: Number(year.value),
      story: story.value,
    });
    
    if (result) {
      title.value = '';
      story.value = '';
      selectedFile.value = null;
      previewUrl.value = '';
    }
  } catch (error) {
    errorMessage.value = '保存回忆失败，请重试';
    console.error('Upload failed:', error);
  } finally {
    isSubmitting.value = false;
  }
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

.error-message {
  background: rgba(244, 67, 54, 0.1);
  color: #f44336;
  padding: 12px 16px;
  border-radius: 12px;
  font-size: 0.9rem;
  border: 1px solid rgba(244, 67, 54, 0.2);
}

.submit-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid currentColor;
  border-top: 2px solid transparent;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  display: inline-block;
  margin-right: 8px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

</style>

