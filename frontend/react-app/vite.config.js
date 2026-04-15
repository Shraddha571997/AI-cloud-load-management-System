import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react()],
    server: {
      port: 3000,
      // Dev proxy: forwards /api calls to local Flask server
      proxy: {
        '/api': {
          target: env.VITE_API_URL || 'http://127.0.0.1:5000',
          changeOrigin: true,
          secure: false,
        },
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: false, // disable sourcemaps in production for smaller bundle
      rollupOptions: {
        output: {
          manualChunks: {
            react: ['react', 'react-dom'],
            recharts: ['recharts'],
          }
        }
      }
    },
    define: {
      // Expose VITE_API_URL to runtime code (used by api.js if needed)
      __API_URL__: JSON.stringify(env.VITE_API_URL || ''),
    }
  }
})