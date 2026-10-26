// Draws the favicon (the ∞ and its light on the Start button's cyan, option E of the mock-ups)
// into public/: favicon.svg, favicon.ico (16, 32 and 48 px), apple-touch-icon.png (180 px), and
// icon-192.png and icon-512.png for manifest.webmanifest.
// Run with `node tools/build-favicon.mjs public`. Renders with Playwright's Chromium, which the
// tests already install.
import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

const out = process.argv[2];
const PATH = 'M 8 32 C 8 10, 20 10, 32 32 C 44 54, 56 54, 56 32 C 56 10, 44 10, 32 32 C 20 54, 8 54, 8 32 Z';
const F = 0.42;
const DUR = 1.5;

const browser = await chromium.launch();
const page = await browser.newPage();

const at = await page.evaluate(([d, f]) => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', d);
    svg.appendChild(path);
    document.body.appendChild(svg);
    const p = path.getPointAtLength(path.getTotalLength() * f);
    return { x: +p.x.toFixed(2), y: +p.y.toFixed(2) };
}, [PATH, F]);

// The motion path relative to where the light sits, so the still frame (Chrome, Safari) and
// the moving one (Firefox) agree
const relative = PATH.replace(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g, (_, x, y) =>
    `${+(x - at.x).toFixed(2)} ${+(y - at.y).toFixed(2)}`
);

function svg({ rounded, animate }) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs>
    <linearGradient id="tile" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#67e8f9"/>
      <stop offset="1" stop-color="#0ea5c6"/>
    </linearGradient>
    <radialGradient id="halo">
      <stop offset="0" stop-color="#fff" stop-opacity="0.9"/>
      <stop offset="0.35" stop-color="#fff" stop-opacity="0.4"/>
      <stop offset="1" stop-color="#fff" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="64" height="64"${rounded ? ' rx="14"' : ''} fill="url(#tile)"/>
  <path d="${PATH}" fill="none" stroke="#032029" stroke-width="5.5" stroke-linejoin="round"/>
  <g transform="translate(${at.x} ${at.y})">
    <circle r="10" fill="url(#halo)"/>
    <circle r="4.4" fill="#fff" stroke="#032029" stroke-width="2"/>${
        animate
            ? `
    <animateMotion dur="${DUR}s" begin="-${(F * DUR).toFixed(2)}s" repeatCount="indefinite" path="${relative}"/>`
            : ''
    }
  </g>
</svg>
`;
}

writeFileSync(join(out, 'favicon.svg'), svg({ rounded: true, animate: true }));

async function png(markup, size) {
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(
        `<style>html,body{margin:0;background:transparent}</style><img src="data:image/svg+xml;base64,${Buffer.from(markup).toString('base64')}" width="${size}" height="${size}" style="display:block">`
    );
    await page.waitForFunction(() => document.querySelector('img').complete);
    return page.screenshot({ omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } });
}

const still = svg({ rounded: true, animate: false });
const pngs = [];
for (const size of [16, 32, 48]) {
    pngs.push({ size, data: await png(still, size) });
}
// iOS rounds the corners itself, so the home-screen icon is square and fills the edges
const square = svg({ rounded: false, animate: false });
writeFileSync(join(out, 'apple-touch-icon.png'), await png(square, 180));
// The manifest's, square too: Android masks them to its own shape, and the ∞ sits inside the
// middle 80% it always keeps
for (const size of [192, 512]) {
    writeFileSync(join(out, `icon-${size}.png`), await png(square, size));
}
await browser.close();

// An .ico holding PNGs, which every browser that still asks for one reads
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(pngs.length, 4);
let offset = 6 + 16 * pngs.length;
const entries = pngs.map(({ size, data }) => {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size, 0);
    entry.writeUInt8(size, 1);
    entry.writeUInt8(0, 2);
    entry.writeUInt8(0, 3);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(data.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += data.length;
    return entry;
});
writeFileSync(join(out, 'favicon.ico'), Buffer.concat([header, ...entries, ...pngs.map((p) => p.data)]));
console.log('Wrote favicon.svg, favicon.ico, apple-touch-icon.png, icon-192.png and icon-512.png to', out);
