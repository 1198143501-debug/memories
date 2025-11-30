import { defineStore } from 'pinia';
import { computed, ref, watch } from 'vue';
import { openDB } from 'idb';
import { supabase, MEMORY_TABLE, COMMENTS_TABLE, LIKES_TABLE, STORAGE_BUCKET } from '../config/supabase';

const DB_NAME = 'childhood-memories';
const STORE_NAME = 'memories';
const LIKES_KEY = 'liked-memory-ids';
const ANONYMOUS_USER_KEY = 'anonymous-user-id';

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

// 生成或获取匿名用户ID
const getAnonymousUserId = () => {
  if (typeof window === 'undefined') return 'anonymous';
  
  let userId = window.localStorage.getItem(ANONYMOUS_USER_KEY);
  if (!userId) {
    userId = `anonymous_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    window.localStorage.setItem(ANONYMOUS_USER_KEY, userId);
  }
  return userId;
};

export const useMemoryStore = defineStore('memory', () => {
  const memories = ref([]);
  const sortMode = ref('time');
  const loading = ref(false);
  const initialized = ref(false);
  const likedMemoryIds = ref(new Set());
  const isOnline = ref(false);
  const syncStatus = ref('idle'); // idle, syncing, synced, error
  const anonymousUserId = ref(getAnonymousUserId());
  const subscription = ref(null);

  // 加载本地存储的点赞数据
  const loadLikedIds = () => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(LIKES_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      likedMemoryIds.value = new Set(parsed);
    } catch (err) {
      console.error('加载点赞数据失败:', err);
    }
  };

  // 处理点赞表的实时变更
  const handleLikesChange = async (payload) => {
    const { eventType, new: newLike, old: oldLike } = payload;
    const memoryId = eventType === 'DELETE' ? oldLike.memory_id : newLike.memory_id;
    
    // 找到对应的记忆
    const memory = memories.value.find(m => m.id === memoryId);
    if (!memory) return;
    
    // 获取最新的点赞数
    const { count: likesCount, error: likesError } = await supabase
      .from(LIKES_TABLE)
      .select('*', { count: 'exact', head: true })
      .eq('memory_id', memoryId);
    
    if (!likesError) {
      memory.likes = likesCount || 0;
    }
  };

  // 保存点赞数据到本地存储
  const persistLikedIds = () => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(LIKES_KEY, JSON.stringify([...likedMemoryIds.value]));
  };

  // 检查网络状态 - 简化的网络检查
  const checkOnlineStatus = async () => {
    // 简化的网络状态检查，避免频繁的 Supabase 请求
    if (!supabase) {
      isOnline.value = false;
      return false;
    }
    
    // 使用浏览器内置的在线状态检测
    if (typeof navigator !== 'undefined' && 'onLine' in navigator) {
      isOnline.value = navigator.onLine;
      return navigator.onLine;
    }
    
    // 如果没有 navigator.onLine，默认设为 true（假设在线）
    isOnline.value = true;
    return true;
  };

  // 设置实时订阅 - 暂时禁用实时订阅功能
  const setupRealtimeSubscription = () => {
    console.log('实时订阅功能已禁用');
    return; // 直接返回，不设置任何订阅
    
    if (!supabase || subscription.value) return;

    subscription.value = supabase
      .channel('memories-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: MEMORY_TABLE }, handleRealtimeChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: LIKES_TABLE }, handleLikesChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: COMMENTS_TABLE }, handleCommentsChange)
      .subscribe();
  };

  // 处理实时数据变更
  const handleRealtimeChange = async (payload) => {
    const { eventType, new: newRecord, old: oldRecord } = payload;
    
    if (eventType === 'INSERT') {
      // 获取点赞数
      const { count: likesCount, error: likesError } = await supabase
        .from(LIKES_TABLE)
        .select('*', { count: 'exact', head: true })
        .eq('memory_id', newRecord.id);
      
      const recordWithLikes = {
        ...newRecord,
        likes_count: likesError ? 0 : (likesCount || 0)
      };
      
      const memory = await transformSupabaseMemory(recordWithLikes);
      const existingIndex = memories.value.findIndex(m => m.id === memory.id);
      if (existingIndex === -1) {
        memories.value.unshift(memory);
      }
    } else if (eventType === 'UPDATE') {
      // 获取点赞数
      const { count: likesCount, error: likesError } = await supabase
        .from(LIKES_TABLE)
        .select('*', { count: 'exact', head: true })
        .eq('memory_id', newRecord.id);
      
      const recordWithLikes = {
        ...newRecord,
        likes_count: likesError ? 0 : (likesCount || 0)
      };
      
      const memory = await transformSupabaseMemory(recordWithLikes);
      const index = memories.value.findIndex(m => m.id === memory.id);
      if (index !== -1) {
        memories.value[index] = memory;
      }
    } else if (eventType === 'DELETE') {
      const index = memories.value.findIndex(m => m.id === oldRecord.id);
      if (index !== -1) {
        revokeObjectUrl(oldRecord.id);
        memories.value.splice(index, 1);
      }
    }
  };

  const handleCommentsChange = async (payload) => {
    const { eventType, new: newComment, old: oldComment } = payload;
    
    console.log('评论实时变化:', eventType, newComment?.id || oldComment?.id);
    
    if (eventType === 'INSERT' && newComment) {
      // 新增评论
      const memoryIndex = memories.value.findIndex(m => m.id === newComment.memory_id);
      if (memoryIndex !== -1) {
        const memory = memories.value[memoryIndex];
        const comment = {
          id: newComment.id,
          author: newComment.author,
          content: newComment.content,
          createdAt: new Date(newComment.created_at).getTime()
        };
        
        // 避免重复添加
        if (!memory.comments.find(c => c.id === comment.id)) {
          memory.comments.push(comment);
          memory.comments.sort((a, b) => a.createdAt - b.createdAt);
        }
      }
    } else if (eventType === 'DELETE' && oldComment) {
      // 删除评论
      const memoryIndex = memories.value.findIndex(m => m.id === oldComment.memory_id);
      if (memoryIndex !== -1) {
        const memory = memories.value[memoryIndex];
        const commentIndex = memory.comments.findIndex(c => c.id === oldComment.id);
        if (commentIndex !== -1) {
          memory.comments.splice(commentIndex, 1);
        }
      }
    }
  };

  // 转换 Supabase 数据格式
  const transformSupabaseMemory = async (record) => {
    let mediaUrl = '';
    if (record.media_url) {
      if (record.media_url.startsWith('http')) {
        mediaUrl = record.media_url;
      } else {
        // 从 Supabase Storage 获取 URL
        const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(record.media_url);
        mediaUrl = data.publicUrl;
      }
    }

    return {
      id: record.id,
      title: record.title,
      year: record.year,
      story: record.story,
      createdAt: new Date(record.created_at).getTime(),
      likes: record.likes_count || 0,
      mediaType: record.media_type,
      mediaUrl,
      comments: record.comments || [],
      userId: record.user_id,
      blob: null, // Supabase 存储不使用本地 blob
    };
  };

  loadLikedIds();
  checkOnlineStatus();

  // 计算属性
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

  // 本地存储操作
  const persistRecord = async (record) => {
    try {
      const db = await dbPromise;
      // 清理无法序列化的数据
      const cleanRecord = {
        ...record,
        blob: null, // 移除 blob 对象
        comments: Array.isArray(record.comments) ? record.comments.map(comment => ({
          id: comment.id,
          author: comment.author,
          content: comment.content,
          createdAt: comment.createdAt
        })) : [], // 清理评论对象，只保留可序列化的字段
      };
      
      console.log('保存数据到 IndexedDB:', cleanRecord.id, cleanRecord.title);
      await db.put(STORE_NAME, cleanRecord);
      console.log('✅ 数据保存成功:', cleanRecord.id);
    } catch (error) {
      console.error('❌ 保存数据失败:', error);
      throw error;
    }
  };

  const loadMemories = async () => {
    if (initialized.value) return;
    
    console.log('开始加载回忆数据...');
    loading.value = true;
    
    try {
      // 首先尝试从 Supabase 加载
      const online = await checkOnlineStatus();
      console.log('网络状态:', online ? '在线' : '离线');
      
      if (online) {
        console.log('尝试从 Supabase 加载数据...');
        await loadFromSupabase();
        // 暂时禁用实时订阅
        // setupRealtimeSubscription();
      } else {
        console.log('离线模式，从本地加载数据...');
        await loadFromLocal();
      }
      
      console.log('数据加载完成，共', memories.value.length, '条记录');
      initialized.value = true;
    } catch (error) {
      console.error('数据加载失败:', error);
      // 出错时尝试从本地加载
      await loadFromLocal();
      initialized.value = true;
    } finally {
      loading.value = false;
    }
  };

  // 从 Supabase 加载数据
  const loadFromSupabase = async () => {
    if (!supabase) return;
    
    try {
      syncStatus.value = 'syncing';
      
      // 获取记忆列表
      const { data: memoriesData, error: memoriesError } = await supabase
        .from(MEMORY_TABLE)
        .select('*')
        .order('created_at', { ascending: false });

      if (memoriesError) throw memoriesError;

      // 获取每个记忆的点赞数和评论
      const memoriesWithDetails = await Promise.all(
        memoriesData.map(async (record) => {
          // 获取点赞数
          const { count: likesCount, error: likesError } = await supabase
            .from(LIKES_TABLE)
            .select('*', { count: 'exact', head: true })
            .eq('memory_id', record.id);

          if (likesError) {
            console.error(`获取记忆 ${record.id} 的点赞数失败:`, likesError);
          }

          // 获取评论
          const { data: commentsData, error: commentsError } = await supabase
            .from(COMMENTS_TABLE)
            .select('*')
            .eq('memory_id', record.id)
            .order('created_at', { ascending: true });

          if (commentsError) {
            console.error(`获取记忆 ${record.id} 的评论失败:`, commentsError);
          }

          // 转换评论格式
          const comments = Array.isArray(commentsData) ? commentsData.map(comment => ({
            id: comment.id,
            author: comment.author,
            content: comment.content,
            createdAt: new Date(comment.created_at).getTime()
          })) : [];

          // 更新记录中的点赞数字段和评论
          const recordWithDetails = {
            ...record,
            likes_count: likesError ? 0 : (likesCount || 0),
            comments: comments
          };

          return transformSupabaseMemory(recordWithDetails);
        })
      );

      memories.value = memoriesWithDetails;
      
      // 同步到本地存储
      const db = await dbPromise;
      const tx = db.transaction(STORE_NAME, 'readwrite');
      memoriesWithDetails.forEach(memory => {
        tx.store.put({
          ...memory,
          blob: null // 不存储 blob 到 IndexedDB
        });
      });
      await tx.done;
      
      syncStatus.value = 'synced';
      console.log(`✅ 从 Supabase 加载完成，共 ${memoriesWithDetails.length} 条记录`);
    } catch (err) {
      console.error('从 Supabase 加载数据失败:', err);
      syncStatus.value = 'error';
      // 失败后尝试从本地加载
      await loadFromLocal();
    }
  };

  // 从本地加载数据
  const loadFromLocal = async () => {
    try {
      console.log('开始从本地加载数据...');
      const db = await dbPromise;
      const stored = await db.getAll(STORE_NAME);
      console.log(`从 IndexedDB 加载了 ${stored.length} 条记录`);
      
      if (stored.length === 0) {
        console.log('本地存储为空');
        memories.value = [];
        return;
      }
      
      memories.value = stored.map((record) => {
        console.log('处理记录:', record.id, record.title);
        return {
          ...record,
          comments: Array.isArray(record.comments) ? record.comments : [],
          mediaUrl: record.blob ? createObjectUrl(record.id, record.blob) : record.mediaUrl || '',
        };
      });
      
      console.log('✅ 本地数据加载完成，共', memories.value.length, '条记录');
    } catch (error) {
      console.error('❌ 从本地加载数据失败:', error);
      memories.value = [];
    }
  };

  // 上传文件到 Supabase Storage
  const uploadFileToStorage = async (file, id) => {
    if (!supabase) return null;
    
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${id}.${fileExt}`;
      const filePath = `${anonymousUserId.value}/${fileName}`;
      
      const { error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;
      
      return filePath;
    } catch (err) {
      console.error('文件上传失败:', err);
      return null;
    }
  };

  // 添加记忆（支持在线和离线）
  const addMemory = async ({ file, title, year, story }) => {
    loading.value = true;
    try {
      const id = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString();
      const mediaType = file.type.startsWith('video') ? 'video' : 'image';
      const createdAt = Date.now();
      const likes = 0;

      let mediaUrl = '';
      let filePath = null;
      
      // 如果在线，上传到 Supabase Storage
      if (isOnline.value && supabase) {
        filePath = await uploadFileToStorage(file, id);
        if (filePath) {
          const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(filePath);
          mediaUrl = data.publicUrl;
        }
      }

      // 本地 blob（离线时使用）
      const buffer = await file.arrayBuffer();
      const blob = new Blob([buffer], { type: file.type });
      if (!mediaUrl) {
        mediaUrl = createObjectUrl(id, blob);
      }

      const memory = {
        id,
        title,
        year,
        story,
        createdAt,
        likes,
        mediaType,
        mediaUrl,
        comments: [],
        userId: anonymousUserId.value,
        blob: filePath ? null : blob, // 如果上传到云端，不存储本地 blob
      };

      // 先保存到本地
      await persistRecord(memory);
      memories.value.unshift(memory);

      // 如果在线，同步到 Supabase
      if (isOnline.value && supabase && filePath) {
        try {
          console.log('开始同步到 Supabase...');
          const { data: insertedMemory, error: insertError } = await supabase.from(MEMORY_TABLE)
            .insert({
              id,
              title,
              year,
              story,
              media_type: mediaType,
              media_url: filePath,
              user_id: anonymousUserId.value,
              created_at: new Date(createdAt).toISOString(),
            })
            .select()
            .single();

          if (insertError) {
            console.error('Supabase 插入错误:', insertError);
            throw insertError;
          }
          
          console.log('✅ 同步到 Supabase 成功:', insertedMemory.id);
        } catch (err) {
          console.error('❌ 同步到 Supabase 失败:', err);
          // 可以在这里实现重试机制
        }
      }

      return { id };
    } finally {
      loading.value = false;
    }
  };

  // 点赞功能（支持在线和离线）
  const likeMemory = async (id) => {
    const target = getMemoryById(id);
    if (!target) return;

    const wasLiked = isLiked(id);
    
    if (wasLiked) {
      target.likes = Math.max(0, target.likes - 1);
      likedMemoryIds.value.delete(id);
    } else {
      target.likes += 1;
      likedMemoryIds.value.add(id);
    }

    persistLikedIds();

    // 更新本地存储
    await persistRecord(target);

    // 如果在线，同步到 Supabase
    if (isOnline.value && supabase) {
      try {
        if (wasLiked) {
          await supabase.from(LIKES_TABLE).delete().match({
            memory_id: id,
            user_id: anonymousUserId.value
          });
        } else {
          await supabase.from(LIKES_TABLE).insert({
            memory_id: id,
            user_id: anonymousUserId.value
          });
        }

        // 更新记忆表的点赞数 - 移除对 likes_count 列的直接更新
        // 点赞数将通过 likes 表的计数来计算
      } catch (err) {
        console.error('同步点赞到 Supabase 失败:', err);
      }
    }
  };

  // 删除记忆
  const deleteMemory = async (id) => {
    const target = getMemoryById(id);
    if (!target) return;

    // 只允许删除自己的记忆
    if (target.userId !== anonymousUserId.value) {
      console.warn('只能删除自己创建的记忆');
      return;
    }

    // 如果在线，先从 Supabase 删除
    if (isOnline.value && supabase) {
      try {
        // 删除文件
        if (target.mediaUrl && target.mediaUrl.includes(STORAGE_BUCKET)) {
          const fileName = target.mediaUrl.split('/').pop();
          const userFolder = target.userId || anonymousUserId.value;
          await supabase.storage.from(STORAGE_BUCKET).remove([`${userFolder}/${fileName}`]);
        }

        // 删除记录
        await supabase.from(MEMORY_TABLE).delete().eq('id', id);
      } catch (err) {
        console.error('从 Supabase 删除失败:', err);
      }
    }

    // 删除本地存储
    const db = await dbPromise;
    await db.delete(STORE_NAME, id);
    
    // 删除内存中的数据
    const index = memories.value.findIndex((m) => m.id === id);
    if (index !== -1) {
      revokeObjectUrl(id);
      memories.value.splice(index, 1);
    }
  };

  // 添加评论
  const addComment = async (id, { author, content }) => {
    const target = getMemoryById(id);
    if (!target) return null;
    
    const trimmedContent = content?.trim();
    if (!trimmedContent) return null;
    
    const comment = {
      id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
      author: author?.trim() || '匿名用户',
      content: trimmedContent,
      createdAt: Date.now(),
    };
    
    if (!Array.isArray(target.comments)) {
      target.comments = [];
    }
    target.comments.push(comment);
    
    // 更新本地存储
    await persistRecord(target);

    // 如果在线，同步到 Supabase
    if (isOnline.value && supabase) {
      try {
        await supabase.from(COMMENTS_TABLE).insert({
          id: comment.id,
          memory_id: id,
          author: comment.author,
          content: comment.content,
          created_at: new Date(comment.createdAt).toISOString(),
          user_id: anonymousUserId.value
        });
      } catch (err) {
        console.error('同步评论到 Supabase 失败:', err);
      }
    }

    return comment;
  };

  // 同步本地数据到 Supabase
  const syncLocalToSupabase = async () => {
    if (!isOnline.value || !supabase) return;
    
    syncStatus.value = 'syncing';
    try {
      const db = await dbPromise;
      const localMemories = await db.getAll(STORE_NAME);
      
      for (const memory of localMemories) {
        // 只同步当前匿名用户的数据
        if (memory.userId !== anonymousUserId.value) continue;
        
        // 检查是否已存在于 Supabase
        const { data: existing } = await supabase
          .from(MEMORY_TABLE)
          .select('id')
          .eq('id', memory.id)
          .single();

        if (!existing) {
          // 上传文件（如果存在本地 blob）
          let filePath = null;
          if (memory.blob) {
            filePath = await uploadFileToStorage(memory.blob, memory.id);
          }

          // 插入到 Supabase - 移除 likes_count 字段
          const { data: insertedMemory, error: insertError } = await supabase.from(MEMORY_TABLE).insert({
            id: memory.id,
            title: memory.title,
            year: memory.year,
            story: memory.story,
            media_type: memory.mediaType,
            media_url: filePath || memory.mediaUrl,
            user_id: memory.userId,
            created_at: new Date(memory.createdAt).toISOString(),
          }).select().single();

          if (insertError) throw insertError;
        }
      }
      
      syncStatus.value = 'synced';
    } catch (err) {
      console.error('同步本地数据失败:', err);
      syncStatus.value = 'error';
    }
  };

  // 监听网络状态变化 - 暂时禁用网络状态监听
  // if (typeof window !== 'undefined') {
  //   window.addEventListener('online', async () => {
  //     isOnline.value = true;
  //     await syncLocalToSupabase();
  //     setupRealtimeSubscription();
  //   });
  //   
  //   window.addEventListener('offline', () => {
  //     isOnline.value = false;
  //     if (subscription.value) {
  //       subscription.value.unsubscribe();
  //       subscription.value = null;
  //     }
  //   });
  // }

  const isLiked = (id) => likedMemoryIds.value.has(id);

  return {
    memories,
    sortedMemories,
    groupedByYear,
    years,
    sortMode,
    loading,
    initialized,
    isOnline,
    syncStatus,
    anonymousUserId,
    isLiked,
    likeMemory,
    addMemory,
    deleteMemory,
    addComment,
    loadMemories,
    getMemoryById,
    syncLocalToSupabase,
    checkOnlineStatus,
  };
});