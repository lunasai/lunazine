/**
 * Generates optimized, responsive ticker images.
 *
 * Source images live in asset-sources/visual_work/ alongside ticker.json.
 * Generated output goes to assets/ticker/generated/ (git-ignored, rebuild any time).
 * A runtime manifest is written to assets/ticker/manifest.json.
 *
 * Two widths are generated per image:
 *   800w  — ticker card display size (also modal on mobile)
 *   1600w — 2× HiDPI for modal full-size view
 *
 * Three formats:
 *   avif  — best compression, modern browsers
 *   webp  — wide support, good fallback
 *   png/jpg — universal fallback (jpg for originally-jpeg/gif sources)
 *
 * Run:  npm run ticker:optimize
 */

import { mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root     = join(__dirname, "..");
const srcDir   = join(root, "asset-sources", "visual_work");
const outDir   = join(root, "assets", "ticker", "generated");
const mapFile  = join(srcDir, "ticker.json");
const manifest = join(root, "assets", "ticker", "manifest.json");

const WIDTHS = [800, 1600];

function fallbackExt(sourceFile) {
  const ext = extname(sourceFile).toLowerCase();
  return ext === ".jpg" || ext === ".jpeg" || ext === ".gif" ? "jpg" : "png";
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

  const fallExt = fallbackExt(entry.source);
  const result  = {
    alt:     entry.alt,
    caption: entry.caption,
    label:   entry.label,
    sources: {},
  };

  for (const format of ["avif", "webp", fallExt]) {
    const srcsetParts = [];

    for (const w of WIDTHS) {
      const filename = `${id}-${w}w.${format}`;
      const outPath  = join(outDir, filename);

      /* animated: false extracts first frame from GIFs */
      const img  = sharp(src, { animated: false });
      const meta = await img.metadata();

      if (meta.width && w > meta.width) {
        if (w === WIDTHS[1] && !srcsetParts.length) {
          const fname1x = `${id}-${WIDTHS[0]}w.${format}`;
          srcsetParts.push(`./assets/ticker/generated/${fname1x} ${WIDTHS[0]}w`);
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
      srcsetParts.push(`./assets/ticker/generated/${filename} ${w}w`);
      console.log(`  wrote ${filename} (${(buf.byteLength / 1024).toFixed(0)} KB)`);
    }

    if (srcsetParts.length) {
      result.sources[format] = srcsetParts.join(", ");
    }
  }

  result.src = `./assets/ticker/generated/${id}-${WIDTHS[0]}w.${fallExt}`;

  return result;
}

async function main() {
  const map = JSON.parse(await readFile(mapFile, "utf8"));

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

  /* Ensure assets/ticker/ dir exists before writing manifest */
  await mkdir(join(root, "assets", "ticker"), { recursive: true });
  await writeFile(manifest, JSON.stringify(output, null, 2) + "\n");
  console.log(`\nManifest written to assets/ticker/manifest.json`);

  if (errors) {
    console.error(`\n${errors} source file(s) missing — fix ticker.json or add the missing files.`);
    process.exit(1);
  }

  console.log(`\nOptimization complete.`);
}

main().catch((err) => {
  console.error("Ticker optimization failed:", err);
  process.exit(1);
});
