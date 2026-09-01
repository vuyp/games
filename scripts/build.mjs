// Bundles the simulator into a single self-contained HTML file (dist/arcade.html).
// Three.js is inlined, so the result works offline and from any static host.
import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const result = await build({
  entryPoints: [resolve(root, 'src/main.js')],
  bundle: true,
  format: 'iife',
  minify: true,
  target: ['es2020'],
  write: false,
  legalComments: 'none',
  logLevel: 'info',
});

const js = result.outputFiles[0].text;
const css = readFileSync(resolve(root, 'src/styles.css'), 'utf8');
let html = readFileSync(resolve(root, 'index.html'), 'utf8');

// Strip the dev-only import map and module script, then inline the bundle + styles.
html = html
  .replace(/<script type="importmap">[\s\S]*?<\/script>\s*/m, '')
  .replace(/<link rel="stylesheet" href="src\/styles.css"\s*\/?>/, () => `<style>\n${css}\n</style>`)
  .replace(/<script type="module" src="src\/main.js"><\/script>/, () => `<script>\n${js}\n</script>`);

mkdirSync(resolve(root, 'dist'), { recursive: true });
writeFileSync(resolve(root, 'dist/arcade.html'), html);
console.log(`dist/arcade.html written (${(html.length / 1024).toFixed(0)} KB)`);

// Body-only variant for hosts that wrap the page in their own <html>/<head>/<body> skeleton.
const head = html.match(/<head>([\s\S]*?)<\/head>/)[1]
  .split('\n').filter(l => /<title>|<link|<style|<\/style|^\s*$/.test(l) || !/<meta/.test(l)).join('\n')
  .replace(/<meta[^>]*>\s*/g, '');
const body = html.match(/<body>([\s\S]*?)<\/body>/)[1];
writeFileSync(resolve(root, 'dist/arcade-embed.html'), `${head}\n${body}`);
console.log('dist/arcade-embed.html written');
