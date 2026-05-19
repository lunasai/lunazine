/**
 * Copies the CV PDF from asset-sources/cv/ into assets/cv/.
 *
 * Source config: asset-sources/cv/cv.json (source + output filename).
 * Replace the source PDF, then run: npm run sync:cv
 */
import { copyFile, mkdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const srcDir = join(root, "asset-sources", "cv");
const configPath = join(srcDir, "cv.json");
const outDir = join(root, "assets", "cv");

const config = JSON.parse(await readFile(configPath, "utf8"));
const { source, output } = config;

if (!source || !output) {
  console.error("sync-cv: asset-sources/cv/cv.json must include source and output");
  process.exit(1);
}

const sourcePath = join(srcDir, source);
const outPath = join(outDir, output);

try {
  await readFile(sourcePath);
} catch {
  console.error(`sync-cv: source not found: ${sourcePath}`);
  process.exit(1);
}

await mkdir(outDir, { recursive: true });
await copyFile(sourcePath, outPath);

const pdf = await readFile(outPath);
console.log(`sync-cv: copied ${sourcePath} → ${outPath} (${pdf.length} bytes)`);
