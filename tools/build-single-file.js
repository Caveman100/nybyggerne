// Valgfrit: byg hele spillet som ÉN html-fil, man kan sende til venner eller åbne direkte.
//
//   npm install                  (første gang – henter esbuild)
//   npm run build:single         → dist/nybyggerne.html (ca. 4 MB)
//
// Til almindelig brug behøver du ikke dette: GitHub Pages kører filerne direkte.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rel = p => path.join(ROOT, p);
const MIME = { '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml', '.gltf': 'model/gltf+json', '.bin': 'application/octet-stream', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg' };
const dataUri = file => `data:${MIME[path.extname(file)]};base64,${fs.readFileSync(file).toString('base64')}`;

// 1) Alle billeder og modeller som data-URI'er, slået op efter deres sti
const inlineAssets = {};
const walk = dir => fs.readdirSync(rel(dir), { withFileTypes: true }).forEach(e => {
  const p = dir + '/' + e.name;
  if (e.isDirectory()) walk(p); else if (MIME[path.extname(e.name)] && !p.includes('/fonts/')) inlineAssets[p] = dataUri(rel(p));
});
walk('assets');

// 2) JavaScript samlet i én blok (three.js findes via samme stier som i importmap)
const result = await esbuild.build({
  entryPoints: [rel('js/main.js')], bundle: true, format: 'iife', minify: true, write: false, target: ['es2020'], legalComments: 'none',
  alias: { three: rel('vendor/three/three.module.min.js') },
  plugins: [{ name: 'addons', setup(b) { b.onResolve({ filter: /^three\/addons\// }, a => ({ path: rel('vendor/three/addons/' + a.path.slice('three/addons/'.length)) })); } }],
});
const safe = s => s.replace(/<\/script/gi, '<\\/script');

// 3) CSS med skrifttyper indbygget
const css = ['base', 'game', 'rules', 'start', 'panels', 'dice'].map(n => fs.readFileSync(rel(`css/${n}.css`), 'utf8')).join('\n')
  .replace(/url\(\.\.\/(assets\/fonts\/[^)]+)\)/g, (_, p) => `url(${dataUri(rel(p))})`);

// 4) Sæt det hele ind i index.html
let html = fs.readFileSync(rel('index.html'), 'utf8')
  .replace(/<link rel="stylesheet"[^>]*>\n?/g, '')
  .replace(/<script type="importmap">[\s\S]*?<\/script>\n?/, '')
  .replace('<link rel="icon" href="assets/images/favicon.svg">', `<link rel="icon" href="${dataUri(rel('assets/images/favicon.svg'))}">`)
  .replace('</head>', () => `<style>\n${css}</style>\n</head>`)
  .replace('<script src="vendor/peerjs.min.js"></script>', () => `<script>${safe(fs.readFileSync(rel('vendor/peerjs.min.js'), 'utf8'))}</script>`)
  .replace('<script type="module" src="js/main.js"></script>', () =>
    `<script>window.__INLINE_ASSETS = ${JSON.stringify(inlineAssets)};</script>\n<script>${safe(result.outputFiles[0].text)}</script>`)
  .replace(/<script>\n  \/\/ Åbnet direkte som fil\?[\s\S]*?<\/script>\n?/, '');

fs.mkdirSync(rel('dist'), { recursive: true });
fs.writeFileSync(rel('dist/nybyggerne.html'), html);
console.log('dist/nybyggerne.html', (html.length / 1024 / 1024).toFixed(2), 'MB');
