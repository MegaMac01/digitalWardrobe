import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'mui-vendor': ['@mui/material', '@mui/icons-material', '@emotion/react', '@emotion/styled'],
          'firebase-core': ['firebase/app'],
          'firebase-auth': ['firebase/auth'],
          'firebase-db': ['firebase/firestore'],
          'firebase-storage': ['firebase/storage'],
        },
      },
    },
  },
})
