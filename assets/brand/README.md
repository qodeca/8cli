# 8cli – Cut eight

The owner selected **Cut eight**: “I like the Cut eight (option 3)”.
The [decision is recorded on #37](https://github.com/qodeca/8cli/issues/37#issuecomment-5803687602).
Two diagonal counters cut a compact, solid eight – a distinctive stamp for independent
command-line tooling. Design review remains required before merge.

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="banner-dark.svg">
  <img src="banner-light.svg" alt="8cli – AI-first. JSON by default.">
</picture>

## Files and usage

Each filename below has both `.svg` and `.png` versions:

| Files                         | Dimensions | Use                                                                                |
| ----------------------------- | ---------- | ---------------------------------------------------------------------------------- |
| `logo-light`, `logo-dark`     | 512 × 512  | Transparent mark; choose the variant for the background theme. Legible at 32 × 32. |
| `banner-light`, `banner-dark` | 1440 × 480 | Opaque README hero; use a theme-aware picture element as above.                    |
| `social-light`, `social-dark` | 800 × 800  | Opaque square social artwork.                                                      |

All brand-name lettering and logo geometry are paths. Supporting copy uses Menlo with
Consolas and monospace fallbacks; metrics may vary on other machines. PNGs use the SVG's
native dimensions. The README integration is tracked by [#35](https://github.com/qodeca/8cli/issues/35).

## Provenance

Original AI-authored vector artwork by OpenAI Codex, created directly as SVG through
`generate.py`; no image model, stock art, downloaded graphics or third-party logo paths
were used. The exact backend model revision is unavailable.

The original brief requested three directions for an AI-first, JSON-by-default CLI,
with logo marks, wide banners, square social artwork and light/dark variants, without
n8n trademarks or endorsement. Cut eight explored a solid geometric eight with diagonal
cuts. Following owner selection, the generator and assets retain only that direction;
the alternatives remain in Git history.

`CLAUDE.md` and the root README supplied product positioning. The configured
`docs/design-system` directory did not exist. Monospace copy and restrained layout
follow the CLI and README code examples; the amber palette and bespoke wordmark are
original. No n8n artwork or trademark appears in the images.

The installed `xezar-visual-asset` skill had no declared version; its original SHA-256 was
`53a499277b199cf111c736245acc65da82f129e194a9ce4d3d87ed3071a7ca49`.
Artwork and scripts use the repository's GPL-3.0-only licensing and Qodeca attribution.

## Regeneration

Run from the repository root with Python 3 and an already installed Google Chrome:

```sh
python3 assets/brand/generate.py
python3 assets/brand/render.py '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
```

The renderer accepts the Chrome executable path, never installs a renderer, and keeps
temporary profiles under `.local/xezar/scratch/brand/`. The supplied PNGs were rendered
with Chrome 153.0.8010.53 on macOS. Edit `generate.py`, then regenerate both formats.
No application build step or dependency is added.
