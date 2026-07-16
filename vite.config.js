import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Replace 'tournament-manager' with your exact GitHub repository name
export default defineConfig({
  plugins: [react()],
  base: '/Fifa-Tournament_tracker/', 
})