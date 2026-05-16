/**
 * Pulls moon phase paths from assets/moon-icon into inline <symbol>s.
 * Run: node ./scripts/sync-moon-sprite.mjs
 * Invoked automatically from npm run build (see scripts/build.mjs).
 */
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const moonDir = join(root, "assets", "moon-icon");

/** Symbol id → source filename (assets/moon-icon) */
const PHASE_FILES = [
  ["moon-new-moon", "new moon.svg"],
  ["moon-waxing-crescent", "waxing crescent.svg"],
  ["moon-first-quarter", "first quarter.svg"],
  ["moon-waxing-gibbous", "waxing gibbous.svg"],
  ["moon-full-moon", "full moon.svg"],
  ["moon-waning-gibbous", "waning gibbous.svg"],
  ["moon-third-quarter", "third quarter.svg"],
  ["moon-waning-crescent", "waning crescent.svg"],
];

const PREVIEW_FILES = ["previews/navbar.html", "previews/components.html"];

function normalizePaths(body) {
  return body
    .replace(/\bfill="#ffffff"/g, 'fill="currentColor"')
    .replace(/\bfill='#ffffff'/g, 'fill="currentColor"')
    .trim();
}

function buildSymbolElement(svgRaw, symbolId, viewBox) {
  const body = svgRaw
    .replace(/^[\s\S]*?<svg\b[^>]*>/i, "")
    .replace(/<\/svg>\s*$/i, "")
    .trim();
  const paths = normalizePaths(body);
  const inner = paths
    .split("\n")
    .map((line) => `        ${line.trim()}`)
    .filter((line) => line.length > 0)
    .join("\n");
  return `      <symbol id="${symbolId}" viewBox="${viewBox}">\n${inner}\n      </symbol>`;
}

async function readPhase(symbolId, filename) {
  const abs = join(moonDir, filename);
  const raw = await readFile(abs, "utf8");
  const vbMatch = raw.match(/\bviewBox="([^"]+)"/);
  if (!vbMatch) throw new Error(`Missing viewBox in ${filename}`);
  return buildSymbolElement(raw, symbolId, vbMatch[1]);
}

function wrapStandaloneSprite(symbolLines) {
  return (
    `<!-- Auto-generated from assets/moon-icon — run: npm run sync:moon -->\n` +
    `<svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" class="moon-icon-sprite" focusable="false" style="position:absolute;width:0;height:0;overflow:hidden">\n` +
    `${symbolLines.join("\n")}\n` +
    `</svg>`
  );
}

function patchBetween(content, startMarker, endMarker, replacement) {
  const i = content.indexOf(startMarker);
  const j = content.indexOf(endMarker);
  if (i === -1 || j === -1 || j <= i) {
    throw new Error(`Markers not found or invalid: ${startMarker} / ${endMarker}`);
  }
  const lineStart = content.lastIndexOf("\n", j) + 1;
  const indent = content.slice(lineStart, j);
  return (
    content.slice(0, i + startMarker.length) +
    "\n" +
    replacement +
    "\n" +
    indent +
    content.slice(j)
  );
}

async function main() {
  const symbols = [];
  for (const [id, file] of PHASE_FILES) {
    symbols.push(await readPhase(id, file));
  }

  const indexPath = join(root, "index.html");
  const indexHtml = await readFile(indexPath, "utf8");
  const indexPatched = patchBetween(
    indexHtml,
    "<!-- MOON-PHASE-SYMBOLS:BEGIN -->",
    "<!-- MOON-PHASE-SYMBOLS:END -->",
    symbols.join("\n"),
  );
  await writeFile(indexPath, indexPatched, "utf8");

  const componentPath = join(root, "components", "moon-sprite.html");
  await writeFile(
    componentPath,
    `<!-- Inline once per page (same document as #moon-logo-use). Synced from assets/moon-icon via npm run sync:moon -->\n` +
      wrapStandaloneSprite(symbols),
    "utf8",
  );

  for (const rel of PREVIEW_FILES) {
    const previewPath = join(root, rel);
    let html;
    try {
      html = await readFile(previewPath, "utf8");
    } catch {
      continue;
    }
    if (!html.includes("<!-- MOON-PHASE-SPRITE:BEGIN -->")) continue;
    const out = patchBetween(
      html,
      "<!-- MOON-PHASE-SPRITE:BEGIN -->",
      "<!-- MOON-PHASE-SPRITE:END -->",
      wrapStandaloneSprite(symbols),
    );
    await writeFile(previewPath, out, "utf8");
  }

  console.log("sync-moon-sprite: updated from assets/moon-icon");
}

await main();
