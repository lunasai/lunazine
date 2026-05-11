# Luna Borgo — Personal Website

A personal portfolio website for Luna Borgo, built with vanilla HTML, CSS, and JavaScript.

## Project Structure

```
luna_web/
├── index.html              # Main entry point
├── asset-sources/
│   └── previews/           # Source images + preview mapping (committed)
│       ├── previews.json   # Preview ID → source file mapping
│       └── *.png / *.jpeg  # Original high-res source images
├── assets/
│   ├── previews/
│   │   ├── generated/      # Optimized AVIF/WebP/PNG variants (git-ignored, rebuilt by assets:optimize)
│   │   └── manifest.json   # Runtime manifest: ID → srcset per format
│   ├── moon-icon/          # Moon phase SVG icons
│   ├── favicon/            # PNG/ICO favicon fallbacks
│   └── *.svg               # Logo, icon sprite, favicon SVG
├── css/
│   ├── tokens.css          # Design tokens (colors, spacing, typography)
│   ├── grid.css            # Layout grid system
│   ├── main.css            # Global styles
│   ├── component-navbar.css
│   ├── component-button.css
│   ├── component-bottom.css
│   └── component-scroll-section.css
├── js/
│   └── work-slides.js      # Work section slide logic
├── scripts/
│   ├── build.mjs           # Production build (copies files to dist/)
│   ├── optimize-assets.mjs # Generates optimized preview images + manifest
│   └── generate-favicons.mjs
├── components/             # Isolated HTML component fragments
├── previews/               # Standalone HTML pages for component preview
├── docs/
│   ├── qa/                 # QA reports by breakpoint and category
│   └── brand/              # Brand direction and design system docs
└── brand_ref/              # Reference components and inspiration
```

## Getting Started

Install dependencies, then generate the optimized preview images before serving:

```bash
npm install
npm run assets:optimize   # generates assets/previews/generated/ + manifest.json
npx serve .
```

Or open `index.html` directly in a browser after running `assets:optimize`.

## Development

Component styles live in `css/component-*.css`. Each component also has an isolated HTML fragment in `components/` and a full preview page in `previews/` for standalone development.

## Adding or Replacing a Hover Preview Image

The hover previews (shown when hovering underlined work/about links) use an optimized image pipeline. To add or replace an image:

1. Add the original source image to `asset-sources/previews/` (PNG or JPEG).
2. Open `asset-sources/previews/previews.json` and add or update the entry:
   ```json
   "my-project": {
     "source": "my-project.png",
     "alt": "My project description"
   }
   ```
3. Run `npm run assets:optimize`. This generates AVIF/WebP/PNG variants in `assets/previews/generated/` and updates `assets/previews/manifest.json`.
4. In `index.html`, reference the preview by its ID, not by filename:
   ```html
   <span class="hover-preview-link" data-preview-id="my-project" tabindex="0">link text</span>
   ```

The generated files in `assets/previews/generated/` are git-ignored — they are rebuilt automatically during `npm run build`.

See [`docs/asset-optimization-workflow.md`](docs/asset-optimization-workflow.md) for the full human/agent workflow, including troubleshooting and do/don't guidance.

## Building for Production

```bash
npm run build
```

This runs `assets:optimize` first, then copies everything to `dist/`.

## npm Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Vite dev server on port 5173 |
| `npm run assets:optimize` | Generate optimized preview images + manifest |
| `npm run build` | Full production build to `dist/` |
| `npm run favicons` | Regenerate PNG/ICO favicon fallbacks from source SVG |
| `npm run preview` | Serve `dist/` on port 4173 |

## QA Docs

Responsive and accessibility QA reports are in `docs/qa/`, covering breakpoints 480px, 768px, 1200px, 1440px, and 1920px.