// Bundle the built game into one self-contained HTML file (machi-de-nihongo.html)
// that can be opened straight from disk or hosted anywhere. Run after `vite build`.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const dist = new URL('../dist/', import.meta.url).pathname;
let html = readFileSync(join(dist, 'index.html'), 'utf8');

html = html.replace(/<script type="module" crossorigin src="\.\/(assets\/[^"]+\.js)"><\/script>/, (_, file) => {
  const js = readFileSync(join(dist, file), 'utf8').replace(/<\/script/gi, '<\\/script');
  return `<script type="module">${js}</script>`;
});
html = html.replace(/<link rel="stylesheet" crossorigin href="\.\/(assets\/[^"]+\.css)">/, (_, file) => `<style>${readFileSync(join(dist, file), 'utf8')}</style>`);

if (/src="\.\/assets|href="\.\/assets/.test(html)) throw new Error('An asset was not inlined; check the patterns above.');
const out = new URL('../machi-de-nihongo.html', import.meta.url).pathname;
writeFileSync(out, html);
console.log(`Wrote ${out} (${(html.length / 1024).toFixed(0)} KB)`);
