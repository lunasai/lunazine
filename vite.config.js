import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    open: true,
  },
  build: {
    lib: {
      entry: resolve(__dirname, "src/experience-panel-dither.jsx"),
      name: "mountExperiencePanelDither",
      formats: ["iife"],
      fileName: () => "experience-panel-dither.js",
    },
    outDir: "dist/js",
    emptyOutDir: false,
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
        assetFileNames: "experience-panel-dither[extname]",
      },
    },
  },
});
