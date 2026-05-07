# Luna Borgo — Personal Website

A personal portfolio website for Luna Borgo, built with vanilla HTML, CSS, and JavaScript.

## Project Structure

```
luna_web/
├── index.html              # Main entry point
├── assets/                 # Static assets (logos, icons, fonts)
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
├── components/             # Isolated HTML component fragments
├── previews/               # Standalone HTML pages for component preview
├── docs/
│   ├── qa/                 # QA reports by breakpoint and category
│   └── brand/              # Brand direction and design system docs
└── brand_ref/              # Reference components and inspiration
```

## Getting Started

Open `index.html` directly in a browser, or serve it with any static file server:

```bash
npx serve .
```

## Development

Component styles live in `css/component-*.css`. Each component also has an isolated HTML fragment in `components/` and a full preview page in `previews/` for standalone development.

## QA Docs

Responsive and accessibility QA reports are in `docs/qa/`, covering breakpoints 480px, 768px, 1200px, 1440px, and 1920px.