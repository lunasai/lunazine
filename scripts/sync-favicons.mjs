/**
 * Copies moon-phase favicon SVGs from asset-sources/favicons into assets/favicon/phases/.
 * Run: npm run sync:favicons
 * Then: npm run favicons (regenerates PNG/ICO fallbacks from waxing crescent).
 */
import { copyFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const srcDir = join(root, "asset-sources", "favicons");
const outDir = join(root, "assets", "favicon", "phases");

const PHASE_FILES = [
  "new moon.svg",
  "waxing crescent.svg",
  "first quarter.svg",
  "waxing gibbous.svg",
  "full moon.svg",
  "waning gibbous.svg",
  "third quarter.svg",
  "waning crescent.svg",
];

await mkdir(outDir, { recursive: true });

for (const file of PHASE_FILES) {
  const src = join(srcDir, file);
  const dest = join(outDir, file);
  await copyFile(src, dest);
  console.log(`  ${file}`);
}

console.log(`sync-favicons: copied ${PHASE_FILES.length} SVGs → ${outDir}`);
