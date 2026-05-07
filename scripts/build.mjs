/**
 * Copies deployable static files into dist/. Matches paths used by index.html
 * and runtime JS (e.g. moon-phase.js loading assets/moon-icon/*.svg).
 */
import { cp, mkdir, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const dist = join(root, "dist");

const FILES = ["index.html"];
const DIRS = ["css", "js", "assets", "brand_ref"];

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

for (const name of FILES) {
  await cp(join(root, name), join(dist, name));
}
for (const name of DIRS) {
  await cp(join(root, name), join(dist, name), { recursive: true });
}

console.log("Build output written to dist/");
