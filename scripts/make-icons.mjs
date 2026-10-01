// Génère les 8 icônes de l'application (PNG) : une étiquette (tag) crème, avec deux lignes de note et un œillet doré,
// sur le fond de marque. Le SVG est rendu dans Chromium via Playwright, puis capturé en PNG.
//
//   node scripts/make-icons.mjs
//
// Prérequis : le paquet « playwright » et un Chromium (variable CHROMIUM_PATH, sinon celui de Playwright).
// Changer une icône PWA ⇒ incrémenter `CACHE` dans `public/sw.js` (les icônes sont servies depuis le cache).
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

// Même palette que src/brand.ts (fond de marque grenat) ; l'or et la crème sont ceux de la famille.
const PRIMARY = '#772247';
const ACCENT = '#C9A227';
const CREAM = '#F4EBD9';

/** Motif centré dans un carré de 1024 : étiquette inclinée, pointe à droite. `lines` : 1 ou 2 lignes de note. */
function tagMotif({ lines = 2 } = {}) {
  const body = 'M290 340H640L834 512L640 684H290Q190 684 190 584V440Q190 340 290 340Z';
  // L'œillet est un trou (règle evenodd) : transparent sur les icônes sans fond.
  const eyelet = 'M340 512a40 40 0 1 0-80 0a40 40 0 1 0 80 0Z';
  const stripes =
    `<rect x="410" y="436" width="270" height="46" rx="23" fill="${PRIMARY}"/>` +
    (lines > 1 ? `<rect x="410" y="532" width="180" height="46" rx="23" fill="${PRIMARY}"/>` : '');
  return `<g transform="rotate(-18 512 512)">
    <path d="${body}${eyelet}" fill="${CREAM}" fill-rule="evenodd"/>
    <circle cx="300" cy="512" r="58" fill="none" stroke="${ACCENT}" stroke-width="18"/>
    ${stripes}
  </g>`;
}

/** SVG 1024×1024. `scale` réduit le motif autour du centre (zones de sécurité des masques d'icône). */
function svg({ background, scale = 1, lines = 2 }) {
  const bg = background ? `<rect width="1024" height="1024" fill="${background}"/>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
    ${bg}<g transform="translate(512 512) scale(${scale}) translate(-512 -512)">${tagMotif({ lines })}</g></svg>`;
}

const jobs = [
  // [fichier, taille, options SVG, fond transparent ?]
  ['assets/icon.png', 1024, { background: PRIMARY }, false],
  ['assets/adaptive-icon.png', 1024, { scale: 0.78 }, true], // zone de sécurité Android = cercle de 66 %
  ['assets/splash-icon.png', 1024, {}, true],
  ['assets/favicon.png', 48, { background: PRIMARY, lines: 1, scale: 1.1 }, false], // 1 ligne : lisible en petit
  ['public/icon-192.png', 192, { background: PRIMARY }, false],
  ['public/icon-512.png', 512, { background: PRIMARY }, false],
  ['public/icon-maskable-512.png', 512, { background: PRIMARY, scale: 0.95 }, false], // maskable = cercle de 80 %
  ['public/apple-touch-icon.png', 180, { background: PRIMARY }, false],
];

function loadPlaywright() {
  for (const base of [import.meta.url, '/opt/node22/lib/node_modules/']) {
    try {
      return createRequire(base)('playwright');
    } catch {
      // essaie l'emplacement suivant
    }
  }
  throw new Error('Paquet « playwright » introuvable (npm install --no-save playwright).');
}

const { chromium } = loadPlaywright();
const executablePath = process.env.CHROMIUM_PATH ?? (existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);
const browser = await chromium.launch({ executablePath, args: ['--no-sandbox'] });
for (const [file, size, opts, transparent] of jobs) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  await page.setContent(
    `<html><body style="margin:0;background:transparent"><div style="width:${size}px;height:${size}px">` +
      svg(opts).replace('width="1024" height="1024"', `width="${size}" height="${size}"`) +
      `</div></body></html>`,
  );
  await page.screenshot({ path: `${ROOT}${file}`, omitBackground: transparent, clip: { x: 0, y: 0, width: size, height: size } });
  await page.close();
  console.log('écrit', file);
}
await browser.close();
