// Supabase 客户端配置
import { createClient } from '@supabase/supabase-js'

// 从环境变量获取配置
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// 验证配置
if (!supabaseUrl || supabaseUrl === 'your_supabase_url_here') {
  console.warn('⚠️ 警告: Supabase URL 未配置，请检查 .env 文件中的 VITE_SUPABASE_URL');
}

if (!supabaseAnonKey || supabaseAnonKey === 'your_supabase_anon_key_here') {
  console.warn('⚠️ 警告: Supabase Anon Key 未配置，请检查 .env 文件中的 VITE_SUPABASE_ANON_KEY');
}

// 创建 Supabase 客户端
let supabaseClient = null;

try {
  if (supabaseUrl && supabaseUrl.startsWith('http') && supabaseAnonKey) {
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
    console.log('✅ Supabase 客户端初始化成功');
  } else {
    throw new Error('Invalid Supabase configuration');
  }
} catch (error) {
  console.warn('⚠️ Supabase 客户端初始化失败，使用离线模式:', error.message);
  // 创建一个功能完整的模拟客户端
  supabaseClient = {
    from: (table) => ({
      select: () => ({ 
        data: [], 
        error: null,
        order: () => ({ data: [], error: null }),
        eq: () => ({ data: [], error: null }),
        single: () => ({ data: null, error: null }),
      }),
      insert: (values) => ({ data: values, error: null }),
      update: (values) => ({ data: values, error: null }),
      delete: () => ({ data: null, error: null }),
      subscribe: () => ({ unsubscribe: () => {} }),
    }),
    storage: {
      from: (bucket) => ({
        upload: (path, file, options) => ({ data: { path }, error: null }),
        getPublicUrl: (path) => ({ data: { publicUrl: URL.createObjectURL(file) }, error: null }),
        remove: (paths) => ({ data: null, error: null }),
      }),
    },
    auth: {
      getUser: () => ({ data: { user: null }, error: null }),
    },
  };
}

export const supabase = supabaseClient;

// 数据库表名常量
export const MEMORY_TABLE = 'memories'
export const COMMENTS_TABLE = 'comments'
export const LIKES_TABLE = 'likes'

// 存储桶名常量
export const STORAGE_BUCKET = 'memories-media'