<template>
  <label
    class="upload-zone"
    :class="{ dragging }"
    @dragover.prevent="dragging = true"
    @dragleave.prevent="dragging = false"
    @drop.prevent="handleDrop"
  >
    <input
      type="file"
      accept=".jpg,.jpeg,.png,.mp4"
      class="hidden-input"
      @change="handleChange"
    />
    <div class="content">
      <p>拖拽图片 / 视频到这里，或点击选择文件</p>
      <small>支持 JPG / PNG / MP4，最大 50MB</small>
      <p v-if="error" class="error">{{ error }}</p>
      <p v-if="fileName" class="file-name">已选择：{{ fileName }}</p>
    </div>
  </label>
</template>

<script setup>
import { ref } from 'vue';

const emit = defineEmits(['select']);

const dragging = ref(false);
const error = ref('');
const fileName = ref('');

const isValidFile = (file) => {
  if (!file) return false;
  const validTypes = ['image/jpeg', 'image/png', 'video/mp4'];
  const maxSize = 50 * 1024 * 1024;
  if (!validTypes.includes(file.type)) {
    error.value = '仅支持 JPG / PNG / MP4';
    return false;
  }
  if (file.size > maxSize) {
    error.value = '文件需小于 50MB';
    return false;
  }
  error.value = '';
  return true;
};

const handleFile = (file) => {
  if (isValidFile(file)) {
    fileName.value = file.name;
    emit('select', file);
  }
};

const handleChange = (event) => {
  const [file] = event.target.files;
  handleFile(file);
  event.target.value = '';
};

const handleDrop = (event) => {
  dragging.value = false;
  const file = event.dataTransfer.files[0];
  handleFile(file);
};
</script>

<style scoped>
.upload-zone {
  border: 2px dashed rgba(244, 177, 131, 0.6);
  border-radius: 24px;
  padding: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.7);
  text-align: center;
  cursor: pointer;
  transition: border-color 0.2s ease, transform 0.2s ease;
}

.upload-zone.dragging {
  border-color: var(--accent);
  transform: translateY(-4px);
}

.content {
  color: #6c5a4f;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.hidden-input {
  display: none;
}

.error {
  color: #d9534f;
}

.file-name {
  color: var(--accent-dark);
  font-weight: 600;
}
</style>

