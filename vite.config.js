import { defineConfig } from 'vite';

// Write U+FFFD (used by a dependency as a string literal) as an escape, so the
// bundle is plain text that every host accepts. Same value at runtime.
const escapeReplacementChar = {
  name: 'escape-replacement-char',
  generateBundle(_, bundle) {
    for (const chunk of Object.values(bundle)) {
      if (chunk.type === 'chunk') chunk.code = chunk.code.replaceAll('�', '\\uFFFD');
    }
  },
};

export default defineConfig({
  base: './',
  server: { host: true },
  plugins: [escapeReplacementChar],
  build: {
    // One script file, so `npm run build:html` can inline it into a single HTML page
    rolldownOptions: { output: { codeSplitting: false } },
    chunkSizeWarningLimit: 2000,
  },
});
