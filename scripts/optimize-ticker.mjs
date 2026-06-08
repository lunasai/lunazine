/**
 * Generates optimized ticker assets from source files.
 *
 * Three source types are handled:
 *
 *   Static image  (.png / .jpg / .jpeg)
 *     → avif + webp + png/jpg at 800w & 1600w
 *     → manifest entry: { sources: { avif, webp, png }, src, alt, caption, label }
 *
 *   Animated GIF  (.gif  +  "animated": true in ticker.json)
 *     → resized .gif at 800w  +  poster JPG extracted at ~35% of frame count
 *     → manifest entry: { type: "gif", src, poster, alt, caption, label }
 *
 *   Video  (.mov / .mp4 / .m4v)
 *     → WebM (VP9) + MP4 (H.264) scaled to 800px height  +  poster JPG at ~20% duration
 *     → manifest entry: { type: "video", sources: { webm, mp4 }, poster, alt, caption, label }
 *
 * Run:  npm run ticker:optimize
 */

import { mkdir, readFile, writeFile, rm, stat } from "node:fs/promises";
import { dirname, extname, join }               from "node:path";
import { fileURLToPath }                         from "node:url";
import { execFile }                              from "node:child_process";
import { promisify }                             from "node:util";
import sharp                                     from "sharp";
import ffmpegPath                                from "ffmpeg-static";

const execFileAsync = promisify(execFile);

const __dirname    = dirname(fileURLToPath(import.meta.url));
const root         = join(__dirname, "..");
const srcDir       = join(root, "asset-sources", "visual_work");
const outDir       = join(root, "assets", "ticker", "generated");
const mapFile      = join(srcDir, "ticker.json");
const manifestPath = join(root, "assets", "ticker", "manifest.json");

const IMAGE_WIDTHS  = [800, 1600];
const VIDEO_HEIGHT  = 800; // output height for video/gif; width scales proportionally

/* ── type detection ─────────────────────────────────────────────── */

const VIDEO_EXTS = new Set([".mov", ".mp4", ".m4v"]);

function sourceType(file, entry) {
  const ext = extname(file).toLowerCase();
  if (VIDEO_EXTS.has(ext))                         return "video";
  if (ext === ".gif" && entry.animated === true)   return "gif";
  return "image";
}

function fallbackExt(file) {
  const ext = extname(file).toLowerCase();
  return (ext === ".jpg" || ext === ".jpeg" || ext === ".gif") ? "jpg" : "png";
}

/* ── video helpers ──────────────────────────────────────────────── */

/** Returns duration in seconds by parsing ffmpeg's stderr. */
async function getVideoDuration(inputPath) {
  try {
    await execFileAsync(ffmpegPath, ["-i", inputPath]);
  } catch (err) {
    const m = (err.stderr || "").match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
    if (m) return parseInt(m[1]) * 3600 + parseInt(m[2]) * 60 + parseFloat(m[3]);
  }
  return null;
}

async function kb(filePath) {
  return ((await stat(filePath)).size / 1024).toFixed(0) + "KB";
}

/* ── video processing ───────────────────────────────────────────── */

async function optimiseVideo(id, entry) {
  const sourcePath = join(srcDir, entry.source);
  const dur        = await getVideoDuration(sourcePath);
  const posterAt   = dur ? Math.max(1, dur * 0.2).toFixed(2) : "2";

  const webmFile   = `${id}-800h.webm`;
  const mp4File    = `${id}-800h.mp4`;
  const posterFile = `${id}-poster.jpg`;

  const webmPath   = join(outDir, webmFile);
  const mp4Path    = join(outDir, mp4File);
  const posterPath = join(outDir, posterFile);

  /* Scale to VIDEO_HEIGHT; width must be divisible by 2 */
  const scaleFilter = `scale=-2:${VIDEO_HEIGHT}`;

  /* WebM — VP9 constant quality */
  console.log(`  → ${webmFile} …`);
  await execFileAsync(ffmpegPath, [
    "-i", sourcePath,
    "-vf", scaleFilter,
    "-c:v", "libvpx-vp9",
    "-b:v", "0", "-crf", "33",
    "-cpu-used", "3",
    "-row-mt", "1",
    "-an", "-y",
    webmPath,
  ], { maxBuffer: 100 * 1024 * 1024 });

  /* MP4 — H.264, web-optimised */
  console.log(`  → ${mp4File} …`);
  await execFileAsync(ffmpegPath, [
    "-i", sourcePath,
    "-vf", scaleFilter,
    "-c:v", "libx264",
    "-crf", "22", "-preset", "fast",
    "-pix_fmt", "yuv420p",
    "-movflags", "+faststart",
    "-an", "-y",
    mp4Path,
  ], { maxBuffer: 100 * 1024 * 1024 });

  /* Poster frame at ~20% through the video */
  console.log(`  → ${posterFile} (at ${posterAt}s) …`);
  await execFileAsync(ffmpegPath, [
    "-ss", posterAt,
    "-i", sourcePath,
    "-frames:v", "1",
    "-vf", scaleFilter,
    "-y",
    posterPath,
  ], { maxBuffer: 10 * 1024 * 1024 });

  console.log(`  ✔ ${await kb(webmPath)} webm  ${await kb(mp4Path)} mp4  ${await kb(posterPath)} poster`);

  return {
    type:    "video",
    alt:     entry.alt,
    caption: entry.caption,
    label:   entry.label,
    sources: {
      webm: `./assets/ticker/generated/${webmFile}`,
      mp4:  `./assets/ticker/generated/${mp4File}`,
    },
    poster: `./assets/ticker/generated/${posterFile}`,
  };
}

/* ── animated GIF processing ────────────────────────────────────── */

async function optimiseAnimatedGif(id, entry) {
  const sourcePath = join(srcDir, entry.source);
  let src;
  try { src = await readFile(sourcePath); }
  catch { console.error(`  ✖ source not found: ${entry.source}`); return null; }

  const meta     = await sharp(src, { animated: false }).metadata();
  const nFrames  = meta.pages ?? 1;
  const midFrame = Math.floor(nFrames * 0.35);

  const gifFile    = `${id}-800w.gif`;
  const posterFile = `${id}-poster.jpg`;
  const gifPath    = join(outDir, gifFile);
  const posterPath = join(outDir, posterFile);

  /* Resized animated GIF */
  const gifBuf = await sharp(src, { animated: true })
    .resize({ width: 800, withoutEnlargement: true })
    .gif()
    .toBuffer();
  await writeFile(gifPath, gifBuf);

  /* Poster: representative mid-point frame */
  const posterBuf = await sharp(src, { animated: false, page: midFrame })
    .resize({ width: 800, withoutEnlargement: true })
    .jpeg({ quality: 85, mozjpeg: true })
    .toBuffer();
  await writeFile(posterPath, posterBuf);

  console.log(`  ✔ ${(gifBuf.byteLength / 1024).toFixed(0)}KB gif  ${(posterBuf.byteLength / 1024).toFixed(0)}KB poster (frame ${midFrame}/${nFrames})`);

  return {
    type:    "gif",
    alt:     entry.alt,
    caption: entry.caption,
    label:   entry.label,
    src:     `./assets/ticker/generated/${gifFile}`,
    poster:  `./assets/ticker/generated/${posterFile}`,
  };
}

/* ── static image processing ────────────────────────────────────── */

async function optimiseImage(id, entry) {
  const sourcePath = join(srcDir, entry.source);
  let src;
  try { src = await readFile(sourcePath); }
  catch { console.error(`  ✖ source not found: ${entry.source}`); return null; }

  const fallExt = fallbackExt(entry.source);
  const result  = {
    alt:     entry.alt,
    caption: entry.caption,
    label:   entry.label,
    sources: {},
  };

  for (const format of ["avif", "webp", fallExt]) {
    const srcsetParts = [];

    for (const w of IMAGE_WIDTHS) {
      const filename = `${id}-${w}w.${format}`;
      const outPath  = join(outDir, filename);

      const img  = sharp(src, { animated: false });
      const meta = await img.metadata();

      if (meta.width && w > meta.width) {
        if (w === IMAGE_WIDTHS[1] && !srcsetParts.length) {
          srcsetParts.push(`./assets/ticker/generated/${id}-${IMAGE_WIDTHS[0]}w.${format} ${IMAGE_WIDTHS[0]}w`);
        }
        continue;
      }

      const pipeline = img.clone().resize({ width: w, withoutEnlargement: true });

      if (format === "avif")      pipeline.avif({ quality: 60, effort: 6 });
      else if (format === "webp") pipeline.webp({ quality: 82, effort: 5 });
      else if (format === "jpg")  pipeline.jpeg({ quality: 85, mozjpeg: true });
      else                        pipeline.png({ compressionLevel: 9, palette: false });

      const buf = await pipeline.toBuffer();
      await writeFile(outPath, buf);
      srcsetParts.push(`./assets/ticker/generated/${filename} ${w}w`);
      console.log(`  wrote ${filename} (${(buf.byteLength / 1024).toFixed(0)}KB)`);
    }

    if (srcsetParts.length) result.sources[format] = srcsetParts.join(", ");
  }

  result.src = `./assets/ticker/generated/${id}-${IMAGE_WIDTHS[0]}w.${fallExt}`;
  return result;
}

/* ── main ───────────────────────────────────────────────────────── */

async function main() {
  if (!ffmpegPath) {
    throw new Error("ffmpeg-static binary not found — run: npm install ffmpeg-static");
  }

  const map = JSON.parse(await readFile(mapFile, "utf8"));

  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });

  const output = {};
  let errors   = 0;

  for (const [id, entry] of Object.entries(map)) {
    console.log(`\n[${id}]  ${entry.source}`);
    const type = sourceType(entry.source, entry);
    let result = null;

    try {
      if (type === "video")  result = await optimiseVideo(id, entry);
      else if (type === "gif") result = await optimiseAnimatedGif(id, entry);
      else                   result = await optimiseImage(id, entry);
    } catch (err) {
      console.error(`  ✖ [${id}] failed: ${err.message}`);
      errors++;
      continue;
    }

    if (result) output[id] = result;
    else errors++;
  }

  await mkdir(join(root, "assets", "ticker"), { recursive: true });
  await writeFile(manifestPath, JSON.stringify(output, null, 2) + "\n");
  console.log(`\nManifest → assets/ticker/manifest.json`);

  if (errors) {
    console.error(`\n${errors} entry/entries failed.`);
    process.exit(1);
  }

  console.log("Optimization complete.");
}

main().catch(err => { console.error(err); process.exit(1); });
