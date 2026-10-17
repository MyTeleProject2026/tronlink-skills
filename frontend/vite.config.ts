import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

export default defineConfig({
  plugins: [react()],
  base: '/token-studio-app/',
  build: {
    outDir: '../public/token-studio-app',
    emptyOutDir: true,
    sourcemap: false,
  },
});
