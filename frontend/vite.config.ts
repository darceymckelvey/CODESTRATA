import { defineConfig } from 'vite';
import { resolve } from 'path';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  optimizeDeps: {
    include: ['src/styles/tailwind.css'],
  },
  resolve: {
    alias: {
      src: resolve(__dirname, 'src'),
      'src/tailwind.css': resolve(__dirname, 'src/styles/tailwind.css'),
    },
  },
  plugins: [
    tailwindcss(),
  ],
});
