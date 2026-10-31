import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load environment variables for the current mode
  const env = loadEnv(mode, process.cwd(), '')

  // Render backend or fallback to local
  const BACKEND_TARGET = "https://mudra-dwn3.onrender.com" || 'http://localhost:8000'

  return {
    plugins: [
      react(),
      tailwindcss(),
    ],
    server: {
      host: true,
      allowedHosts: true,
      proxy: {
        '/ws': {
          target: BACKEND_TARGET,
          ws: true,
          changeOrigin: true,
          secure: true,
        },
        '/api': {
          target: BACKEND_TARGET,
          changeOrigin: true,
          secure: true,
        },
      },
    },
    optimizeDeps: {
      include: ['@mediapipe/tasks-vision', 'pdfjs-dist', 'jspdf'],
    },
  }
})