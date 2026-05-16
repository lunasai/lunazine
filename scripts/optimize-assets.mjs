/**
 * Generates optimized, responsive preview images for the hover-preview feature.
 *
 * Source images live in asset-sources/previews/ alongside previews.json.
 * Generated output goes to assets/previews/generated/ (git-ignored, rebuild any time).
 * A runtime manifest is written to assets/previews/manifest.json so the browser
 * JS can pick the best format/size without knowing generated filenames.
 *
 * Three widths are generated per image:
 *   390w — legacy fallback for `<img src>`
 *   780w — 1× when the hover card is shown up to ~780 CSS px wide
 *   1560w — 2× for HiDPI at that full card width
 *
 * Three formats:
 *   avif  — best compression, modern browsers
 *   webp  — wide support, good fallback
 *   png   — universal fallback (or jpg for originally-jpeg sources)
 *
 * Run:  npm run assets:optimize
 */

import { mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root      = join(__dirname, "..");
const srcDir    = join(root, "asset-sources", "previews");
const outDir    = join(root, "assets", "previews", "generated");
const mapFile   = join(srcDir, "previews.json");
const manifest  = join(root, "assets", "previews", "manifest.json");

/* Widths to generate. Keep in sync with the CSS max-width on .hover-preview-card img. */
const WIDTHS = [390, 780, 1560];

/* ── Helpers ────────────────────────────────────────────────────────── */

function fallbackExt(sourceFile) {
  const ext = extname(sourceFile).toLowerCase();
  return ext === ".jpg" || ext === ".jpeg" ? "jpg" : "png";
}

async function optimise(id, entry) {
  const sourcePath = join(srcDir, entry.source);
  let src;

  try {
    src = await readFile(sourcePath);
  } catch {
    console.error(`  ✖ [${id}] source not found: ${entry.source}`);
    process.exitCode = 1;
    return null;
  }

  const base    = `${id}`;
  const fallExt = fallbackExt(entry.source);
  const result  = { alt: entry.alt, sources: {} };
  const widthEntries = {};

  for (const format of ["avif", "webp", fallExt]) {
    const srcsetParts = [];

    for (const w of WIDTHS) {
      const filename = `${base}-${w}w.${format}`;
      const outPath  = join(outDir, filename);
      const img      = sharp(src, { animated: false });
      const meta     = await img.metadata();

      /* Never upscale — skip widths larger than the source */
      if (meta.width && w > meta.width) {
        /* Still add the native width at 1× if we skipped 2× */
        if (w === WIDTHS[1] && !srcsetParts.length) {
          const fname1x = `${base}-${WIDTHS[0]}w.${format}`;
          srcsetParts.push(`./assets/previews/generated/${fname1x} ${WIDTHS[0]}w`);
        }
        continue;
      }

      const pipeline = img.clone().resize({ width: w, withoutEnlargement: true });

      if (format === "avif") {
        pipeline.avif({ quality: 60, effort: 6 });
      } else if (format === "webp") {
        pipeline.webp({ quality: 82, effort: 5 });
      } else if (format === "jpg") {
        pipeline.jpeg({ quality: 85, mozjpeg: true });
      } else {
        pipeline.png({ compressionLevel: 9, palette: false });
      }

      const buf = await pipeline.toBuffer();
      await writeFile(outPath, buf);
      srcsetParts.push(`./assets/previews/generated/${filename} ${w}w`);
      console.log(`  wrote ${filename} (${(buf.byteLength / 1024).toFixed(0)} KB)`);
    }

    if (srcsetParts.length) {
      widthEntries[format] = srcsetParts.join(", ");
    }
  }

  result.sources = widthEntries;

  /* Canonical src: smallest fallback format at 1× for <img src> */
  result.src = `./assets/previews/generated/${base}-${WIDTHS[0]}w.${fallExt}`;

  return result;
}

/* ── Main ───────────────────────────────────────────────────────────── */

async function main() {
  const map = JSON.parse(await readFile(mapFile, "utf8"));

  /* Clean and recreate generated dir */
  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });

  const output = {};
  let errors = 0;

  for (const [id, entry] of Object.entries(map)) {
    console.log(`\n[${id}]`);
    const result = await optimise(id, entry);
    if (result) {
      output[id] = result;
    } else {
      errors++;
    }
  }

  await writeFile(manifest, JSON.stringify(output, null, 2) + "\n");
  console.log(`\nManifest written to assets/previews/manifest.json`);

  if (errors) {
    console.error(`\n${errors} source file(s) missing — fix previews.json or add the missing files.`);
    process.exit(1);
  }

  console.log(`\nOptimization complete. Run npm run build to include in dist/.`);
}

main().catch((err) => {
  console.error("Asset optimization failed:", err);
  process.exit(1);
});
