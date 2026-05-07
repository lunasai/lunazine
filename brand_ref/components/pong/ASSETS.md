## Assets used by `pong.html`

> **Note (brand kit):** The bundled `pong.html` loads **Google Fonts** (DM Mono + Press Start 2P) and does **not** preload MP3 SFX. Use this file when adding local fonts or wiring audio.

### Fonts

- **Nintendoid 1**
  - File: `assets/fonts/nintendoid-1.otf`
  - Used for: score text, pause text, serve dots (canvas)
- **DM Mono**
  - Files:
    - `assets/fonts/DMMono-400.woff2`
    - `assets/fonts/DMMono-500.woff2`
    - `assets/fonts/DMMono-400italic.woff2`
  - Used for: sidebar nav + UI labels (CSS)
- **Work Sans**
  - Loaded via Google Fonts (CSS), used as main UI font (CSS)

### Sound effects

The implementation preloads these audio files and plays them by cloning nodes for overlap:

- `wall`:  `assets/sounds/Sound 18782.mp3` (wall bounce)
- `hitL`:  `assets/sounds/Sound 18783.mp3` (player paddle hit)
- `hitR`:  `assets/sounds/Sound 18784.mp3` (AI paddle hit)
- `score`: `assets/sounds/Sound 18785.mp3` (point scored)
- `serve`: `assets/sounds/Sound 18787.mp3` (serve launch)

Volume:

- `serve`: `0.3`
- others: `0.45`

### Theme-dependent cursors (fun theme)

When `[data-theme="fun"]` is active:

- Default cursor: `assets/cursors/Aero Arrow Live Green Cursor.cur`
- Link cursor: `assets/cursors/Aero Link Live Green Cursor.cur`

Note: `.game-area` sets `cursor: none`, so the canvas area hides the cursor regardless.

