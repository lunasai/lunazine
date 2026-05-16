/**
 * Copies deployable static files into dist/. Matches paths used by index.html
 * and runtime JS (e.g. moon-phase.js toggles #moon-logo-use to inline moon symbols).
 * Moon `<symbol>` paths are synced from assets/moon-icon via scripts/sync-moon-sprite.mjs
 * (runs at the start of this script).
 *
 * assets/previews/generated/ (git-ignored) must already exist before running
 * this script. Run `npm run assets:optimize` first if building from clean.
 */
import { execSync } from "node:child_process";
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { build as viteBuild } from "vite";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const dist = join(root, "dist");

execSync("node ./scripts/sync-moon-sprite.mjs", { cwd: root, stdio: "inherit" });

const DIRS = ["css", "js", "assets", "brand_ref"];

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

for (const name of DIRS) {
  await cp(join(root, name), join(dist, name), { recursive: true });
}

const indexHtml = await readFile(join(root, "index.html"), "utf8");
await writeFile(join(dist, "index.html"), indexHtml);

await viteBuild({
  root,
  configFile: join(root, "vite.config.js"),
});

console.log("Build output written to dist/");
