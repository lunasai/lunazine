/**
 * Generates raster favicon fallbacks (PNG + multi-size ICO) from the full moon
 * SVG used by the navbar logo. Modern browsers use the SVG favicon directly
 * (and js/moon-phase.js swaps it to the current lunar phase at runtime); these
 * raster files are the fallback for older browsers and platforms that don't
 * support SVG favicons (e.g. iOS home screens, some legacy contexts).
 *
 * Run:  npm run favicons
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import pngToIco from "png-to-ico";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const sourceSvg = join(root, "assets", "moon-icon", "full moon.svg");
const outDir = join(root, "assets", "favicon");

/* PNG sizes. ICO bundles the small sizes; apple-touch-icon is the iOS spec. */
const PNG_SIZES = [16, 32, 48, 180];
const ICO_SIZES = [16, 32, 48];

async function renderPng(svgBuffer, size) {
  return sharp(svgBuffer, { density: Math.max(72, Math.ceil((size / 156) * 300)) })
    .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toBuffer();
}

async function main() {
  const svg = await readFile(sourceSvg);
  await mkdir(outDir, { recursive: true });

  const pngBySize = new Map();
  for (const size of PNG_SIZES) {
    const buf = await renderPng(svg, size);
    pngBySize.set(size, buf);
    const filename = size === 180 ? "apple-touch-icon.png" : `favicon-${size}x${size}.png`;
    await writeFile(join(outDir, filename), buf);
    console.log(`  wrote ${filename} (${buf.byteLength} bytes)`);
  }

  const icoBuffer = await pngToIco(ICO_SIZES.map((s) => pngBySize.get(s)));
  await writeFile(join(outDir, "favicon.ico"), icoBuffer);
  console.log(`  wrote favicon.ico (${icoBuffer.byteLength} bytes, sizes: ${ICO_SIZES.join(", ")})`);

  console.log(`\nFavicons generated in ${outDir}`);
}

main().catch((err) => {
  console.error("Favicon generation failed:", err);
  process.exit(1);
});
