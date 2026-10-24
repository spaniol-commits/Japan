import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: { host: true },
  build: {
    // One script file, so `npm run build:html` can inline it into a single HTML page
    rolldownOptions: { output: { codeSplitting: false } },
    chunkSizeWarningLimit: 2000,
  },
});
