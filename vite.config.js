import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  root: '.',
  publicDir: 'public',
  plugins: [react()],
  server: {
    proxy: {
      '/rss-proxy': {
        target: 'https://news.google.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/rss-proxy/, ''),
      },
    },
    hmr: {
      protocol: 'ws',
      host: 'localhost',
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.warn'],
        passes: 2,
      },
      mangle: true,
      format: { comments: false },
    },
    rollupOptions: {
      input: 'index.html',
      output: {
        // Split vendor chunks for better long-term caching
        manualChunks(id) {
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) return 'vendor-react';
          if (id.includes('node_modules/zustand')) return 'vendor-zustand';
        },
        // Hashed filenames for cache busting
        entryFileNames:  'assets/[name]-[hash].js',
        chunkFileNames:  'assets/[name]-[hash].js',
        assetFileNames:  'assets/[name]-[hash][extname]',
      },
    },
    // Raise chunk warning limit slightly for leaflet
    chunkSizeWarningLimit: 600,
    // Generate source maps for production debugging (optional — remove if not needed)
    sourcemap: false,
  },
});
