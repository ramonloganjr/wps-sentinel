// Generates PWA raster icons from the source SVG logo.
// Run with:  npm run gen:icons
//
// Outputs (into public/img/):
//   icon-192.png            transparent, purpose "any"
//   icon-512.png            transparent, purpose "any"
//   icon-maskable-512.png   solid background, logo inside the maskable safe zone
//   apple-touch-icon.png    180px, solid background (iOS ignores SVG icons)
import { Resvg } from '@resvg/resvg-js';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const IMG_DIR = resolve(__dirname, '../public/img');
const BG = '#070707';

const src = readFileSync(resolve(IMG_DIR, 'wps-favicon.svg'), 'utf8');
// Inner markup of the source SVG (viewBox 0 0 171.83 171.83).
const inner = src.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
const VB = 171.83;
const C = VB / 2;

function render(svg, size, out) {
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: size } }).render().asPng();
  writeFileSync(resolve(IMG_DIR, out), png);
  console.log(`  ${out}  (${size}x${size})`);
}

// Transparent, full-bleed "any" icons — render the source directly.
const transparent = (size) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VB} ${VB}">${inner}</svg>`;

// Padded icon on a solid background. `fraction` = logo size as a share of the
// canvas; maskable spec reserves the outer ~10% so keep the logo within ~0.72.
const padded = (fraction) => {
  const scale = (VB * fraction) / VB;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VB} ${VB}">` +
    `<rect width="${VB}" height="${VB}" fill="${BG}"/>` +
    `<g transform="translate(${C} ${C}) scale(${scale}) translate(${-C} ${-C})">${inner}</g>` +
    `</svg>`;
};

console.log('Generating PWA icons…');
render(transparent(192), 192, 'icon-192.png');
render(transparent(512), 512, 'icon-512.png');
render(padded(0.72), 512, 'icon-maskable-512.png');
render(padded(0.82), 180, 'apple-touch-icon.png');
console.log('Done.');
