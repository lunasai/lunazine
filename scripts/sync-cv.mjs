/**
 * Fetches the CV PDF from Google Docs export and writes assets/cv/.
 *
 * Source config: asset-sources/cv/cv.json (googleDocId + output filename).
 * Edit the Google Doc, then run: npm run sync:cv
 *
 * The doc must be shared as "Anyone with the link → Viewer" (or broader).
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const configPath = join(root, "asset-sources", "cv", "cv.json");
const outDir = join(root, "assets", "cv");

const config = JSON.parse(await readFile(configPath, "utf8"));
const { googleDocId, output } = config;

if (!googleDocId || !output) {
  console.error("sync-cv: asset-sources/cv/cv.json must include googleDocId and output");
  process.exit(1);
}

const exportUrl = `https://docs.google.com/document/d/${googleDocId}/export?format=pdf`;

const response = await fetch(exportUrl, { redirect: "follow" });

if (!response.ok) {
  console.error(`sync-cv: export failed (${response.status} ${response.statusText})`);
  console.error("Check that the Google Doc is shared as anyone with the link can view.");
  process.exit(1);
}

const contentType = response.headers.get("content-type") ?? "";
if (!contentType.includes("pdf")) {
  console.error(`sync-cv: expected application/pdf, got ${contentType || "unknown"}`);
  process.exit(1);
}

const pdf = Buffer.from(await response.arrayBuffer());

if (pdf.length < 1024) {
  console.error(`sync-cv: PDF too small (${pdf.length} bytes) — export may be empty or blocked`);
  process.exit(1);
}

await mkdir(outDir, { recursive: true });
const outPath = join(outDir, output);
await writeFile(outPath, pdf);

console.log(`sync-cv: wrote ${outPath} (${pdf.length} bytes)`);
