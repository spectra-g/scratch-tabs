import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { visualizer } from 'rollup-plugin-visualizer';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    visualizer({
      filename: 'dist/stats.html',
      open: true,
      gzipSize: true,
      brotliSize: true,
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Separate Monaco Editor into its own chunk
          monaco: ['@monaco-editor/react'],
          // Separate AI libraries into their own chunk
          ai: ['@xenova/transformers', '@huggingface/transformers'],
          // Separate large UI libraries
          ui: ['framer-motion', 'recharts', 'roughjs'],
          // Separate math library
          math: ['mathjs'],
          // Separate utility libraries
          utils: ['lodash-es', 'date-fns', 'crypto-js'],
          // Separate drag and drop libraries
          dnd: ['@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/modifiers', '@dnd-kit/utilities'],
          // Separate table libraries
          table: ['@tanstack/react-table', '@tanstack/react-virtual'],
          // Separate React Router
          router: ['react-router-dom'],
          // Separate markdown libraries
          markdown: ['react-markdown', 'remark-gfm'],
        },
      },
    },
    // Enable chunk size warnings
    chunkSizeWarningLimit: 1000,
    minify: 'esbuild',
  },
  optimizeDeps: {
    exclude: ["lucide-react"],
    include: [
      // Pre-bundle frequently used dependencies
      'react',
      'react-dom',
      'zustand',
      'clsx',
      'uuid',
      'js-yaml',
      'papaparse',
      'jszip',
      'cron-parser',
      'cronstrue',
      'ics',
      'jose',
      'jwt-decode',
      'punycode',
      'string-similarity',
      'use-undo',
    ],
  },
  // Enable tree shaking
  esbuild: {
    treeShaking: true,
  },
});
