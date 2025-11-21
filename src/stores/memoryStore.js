import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { openDB } from 'idb';

const DB_NAME = 'childhood-memories';
const STORE_NAME = 'memories';
const LIKES_KEY = 'liked-memory-ids';

const dbPromise = openDB(DB_NAME, 1, {
  upgrade(db) {
    if (!db.objectStoreNames.contains(STORE_NAME)) {
      const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      store.createIndex('createdAt', 'createdAt');
      store.createIndex('likes', 'likes');
    }
  },
});

const objectUrlCache = new Map();

const createObjectUrl = (id, blob) => {
  if (!blob) return '';
  if (objectUrlCache.has(id)) return objectUrlCache.get(id);
  const url = URL.createObjectURL(blob);
  objectUrlCache.set(id, url);
  return url;
};

const revokeObjectUrl = (id) => {
  if (!objectUrlCache.has(id)) return;
  URL.revokeObjectURL(objectUrlCache.get(id));
  objectUrlCache.delete(id);
};

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    objectUrlCache.forEach((url) => URL.revokeObjectURL(url));
    objectUrlCache.clear();
  });
}

export const useMemoryStore = defineStore('memory', () => {
  const memories = ref([]);
  const sortMode = ref('time');
  const loading = ref(false);
  const initialized = ref(false);
  const likedMemoryIds = ref(new Set());

  const loadLikedIds = () => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(LIKES_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      likedMemoryIds.value = new Set(parsed);
    } catch (err) {
      console.error(err);
    }
  };

  const persistLikedIds = () => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(LIKES_KEY, JSON.stringify([...likedMemoryIds.value]));
  };

  loadLikedIds();

  const sortedMemories = computed(() => {
    const list = [...memories.value];
    if (sortMode.value === 'heat') {
      return list.sort((a, b) => b.likes - a.likes || b.createdAt - a.createdAt);
    }
    return list.sort((a, b) => b.createdAt - a.createdAt);
  });

  const years = computed(() => {
    const set = new Set(memories.value.map((m) => m.year));
    return Array.from(set).sort((a, b) => Number(a) - Number(b));
  });

  const groupedByYear = computed(() => {
    return years.value.map((year) => ({
      year,
      items: memories.value
        .filter((m) => m.year === year)
        .sort((a, b) => b.createdAt - a.createdAt),
    }));
  });

  const getMemoryById = (id) => memories.value.find((m) => m.id === id);

  const persistRecord = async (record) => {
    const db = await dbPromise;
    await db.put(STORE_NAME, record);
  };

  const loadMemories = async () => {
    if (initialized.value) return;
    const db = await dbPromise;
    const stored = await db.getAll(STORE_NAME);
    memories.value = stored.map((record) => ({
      ...record,
      comments: Array.isArray(record.comments) ? record.comments : [],
      mediaUrl: createObjectUrl(record.id, record.blob),
    }));
    initialized.value = true;
  };

  const addMemory = async ({ file, title, year, story }) => {
    loading.value = true;
    try {
      const id = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString();
      const buffer = await file.arrayBuffer();
      const blob = new Blob([buffer], { type: file.type });
      const mediaType = file.type.startsWith('video') ? 'video' : 'image';
      const createdAt = Date.now();
      const likes = 0;

      const record = {
        id,
        title,
        year,
        story,
        createdAt,
        likes,
        mediaType,
        blob,
        comments: [],
      };

      await persistRecord(record);
      memories.value.unshift({
        ...record,
        mediaUrl: createObjectUrl(id, blob),
      });
      return { id };
    } finally {
      loading.value = false;
    }
  };

  const isLiked = (id) => likedMemoryIds.value.has(id);

  const likeMemory = async (id) => {
    const target = getMemoryById(id);
    if (!target) return;

    if (isLiked(id)) {
      target.likes = Math.max(0, target.likes - 1);
      likedMemoryIds.value.delete(id);
    } else {
      target.likes += 1;
      likedMemoryIds.value.add(id);
    }

    persistLikedIds();

    await persistRecord({
      ...target,
      blob: target.blob,
    });
  };

  const deleteMemory = async (id) => {
    const db = await dbPromise;
    await db.delete(STORE_NAME, id);
    const index = memories.value.findIndex((m) => m.id === id);
    if (index === -1) return;
    revokeObjectUrl(id);
    memories.value.splice(index, 1);
  };

  const addComment = async (id, { author, content }) => {
    const target = getMemoryById(id);
    if (!target) return null;
    const trimmedContent = content?.trim();
    if (!trimmedContent) return null;
    const comment = {
      id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
      author: author?.trim() || '匿名',
      content: trimmedContent,
      createdAt: Date.now(),
    };
    if (!Array.isArray(target.comments)) {
      target.comments = [];
    }
    target.comments.push(comment);
    await persistRecord({
      ...target,
      blob: target.blob,
    });
    return comment;
  };

  return {
    memories,
    sortedMemories,
    groupedByYear,
    years,
    sortMode,
    loading,
    initialized,
    loadMemories,
    addMemory,
    likeMemory,
    isLiked,
    addComment,
    deleteMemory,
    getMemoryById,
  };
});

