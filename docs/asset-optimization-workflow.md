# Asset Optimization Workflow

This site is small, but hover preview images can be large. The workflow keeps original artwork easy to update while serving small, responsive, web-friendly images in production.

Use this guide when adding, replacing, reviewing, or debugging preview assets.

## Quick Start

```bash
npm run assets:optimize
```

This reads `asset-sources/previews/previews.json`, generates optimized image variants, and writes `assets/previews/manifest.json`.

For production:

```bash
npm run build
```

The build runs `assets:optimize` first, then copies files to `dist/`.

## How It Works

Original source files live here:

```text
asset-sources/previews/
```

The source map lives here:

```text
asset-sources/previews/previews.json
```

Generated browser files are written here:

```text
assets/previews/generated/
assets/previews/manifest.json
```

`assets/previews/generated/` is git-ignored because it is rebuilt from source. `assets/previews/manifest.json` is committed because the runtime uses it.

The hover preview markup uses stable IDs:

```html
<span class="hover-preview-link" data-preview-id="crate-design-system" tabindex="0">Crate</span>
```

`js/hover-preview.js` loads `assets/previews/manifest.json` and turns that ID into responsive AVIF/WebP/fallback image sources.

## Add a New Hover Preview

1. Add the original PNG or JPEG source image to `asset-sources/previews/`.
  Example:
2. Add one entry to `asset-sources/previews/previews.json`.
  Use a short, stable ID. The ID should be lowercase, readable, and filename-safe.
3. Reference the preview ID in `index.html`.
  ```html
   <span class="hover-preview-link" data-preview-id="my-project" tabindex="0">my project</span>
  ```
4. Run the optimizer.
  ```bash
   npm run assets:optimize
  ```
5. Build before shipping.
  ```bash
   npm run build
  ```

## Replace an Existing Preview

1. Replace the source file in `asset-sources/previews/`.
2. Keep the same ID in `previews.json` if the page copy should keep working.
3. Run:
  ```bash
   npm run assets:optimize
   npm run build
  ```

Keeping the ID stable means `index.html` does not need to change.

## Current Preview IDs

These IDs are available today:

```text
crate-design-system
crate-tokens
eazle
eazle-brand
adidas-recommendations
me
```

## Output Formats and Sizes

The optimizer creates:

- AVIF for modern browsers.
- WebP for broad modern support.
- PNG fallback for PNG sources.
- JPG fallback for JPEG sources.

It generates the useful hover-preview widths only:

- `390w` for normal displays.
- `780w` for 2x/HiDPI displays when the source is large enough.

Images are never upscaled. If a source is smaller than `780w`, the optimizer only writes the sizes that make sense.

## Do and Don't

Do:

- Add original images to `asset-sources/previews/`.
- Use `previews.json` as the single source of truth.
- Reference previews with `data-preview-id`.
- Run `npm run assets:optimize` after changing source images or `previews.json`.
- Commit source images, `previews.json`, and `assets/previews/manifest.json`.

Don't:

- Point HTML directly at generated image files.
- Edit files in `assets/previews/generated/` by hand.
- Commit `assets/previews/generated/`.
- Add large source PNG/JPEG files directly under `assets/previews/`.
- Rename an existing preview ID unless you also update every `data-preview-id` reference.

## Troubleshooting

If a preview does not show:

1. Check that `index.html` uses a matching `data-preview-id`.
2. Check that the same ID exists in `asset-sources/previews/previews.json`.
3. Check that the mapped `source` file exists in `asset-sources/previews/`.
4. Run `npm run assets:optimize`.
5. Confirm `assets/previews/manifest.json` contains the ID.

If `npm run assets:optimize` fails:

- A mapped source file may be missing.
- `previews.json` may contain invalid JSON.
- The source image may be unreadable by `sharp`.

If generated files are missing from `dist/`:

```bash
npm run build
```

`npm run build` runs the optimizer and then copies `assets/` into `dist/`.