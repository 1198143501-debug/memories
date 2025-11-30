import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
  build: {
    assetsInlineLimit: 8192, // 8KB 阈值，超过此大小的资源将单独输出
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['vue', 'vue-router', 'pinia'],
          supabase: ['@supabase/supabase-js'],
        },
      },
    },
  },
  assetsInclude: [
    '**/*.jpg',
    '**/*.jpeg', 
    '**/*.png',
    '**/*.gif',
    '**/*.svg',
    '**/*.mp4',
    '**/*.webm',
    '**/*.mp3',
    '**/*.wav'
  ],
  optimizeDeps: {
    include: ['@supabase/supabase-js', 'idb', 'gsap'],
  },
});

