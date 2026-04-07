import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Serve the CAM files from the parent directory
    fs: {
      allow: ['..'],
    },
  },
  publicDir: 'public',
})
