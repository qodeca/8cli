#!/usr/bin/env python3
# SPDX-License-Identifier: GPL-3.0-only
# SPDX-FileCopyrightText: 2026 Qodeca sp. z o.o.
"""Regenerate the selected Cut eight SVG assets. Python standard library only."""
from pathlib import Path
from html import escape

ROOT = Path(__file__).resolve().parent


def text(x, y, value, size, color, extra=''):
    return f'<text x="{x}" y="{y}" font-family="Menlo,Consolas,monospace" font-size="{size}" fill="{color}" {extra}>{escape(value)}</text>'


def palette(theme):
    return ('#F6F8FA', '#17232F', '#526171', '#9A5800', '#DFE6EB') if theme == 'light' else ('#101820', '#F1F6FA', '#AAB9C7', '#FFCA75', '#2C3B48')


def mark(color):
    # Cut eight on a 128 × 128 grid; no fonts or external paths.
    return f'''<path fill="{color}" fill-rule="evenodd" d="M36 8H92L116 32V48L100 64L116 80V96L92 120H36L12 96V80L28 64L12 48V32ZM49 29L33 45H79L95 29ZM49 83L33 99H79L95 83Z"/>'''


def wordmark(color):
    # Bespoke geometric lettering rather than an installed font in the brand name.
    return f'''<g fill="none" stroke="{color}" stroke-width="9" stroke-linecap="square" stroke-linejoin="round">
<rect x="5" y="5" width="40" height="35" rx="12"/><rect x="5" y="40" width="40" height="40" rx="12"/>
<path d="M108 30H82Q69 30 69 43V67Q69 80 82 80H108M133 5V80H147M174 32V80"/>
</g><rect x="169.5" y="6" width="9" height="9" fill="{color}"/>'''


def svg(w, h, title, content):
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}" role="img" aria-labelledby="title">
<!-- SPDX-License-Identifier: GPL-3.0-only -->
<!-- SPDX-FileCopyrightText: 2026 Qodeca sp. z o.o. -->
<title id="title">{escape(title)}</title>
{content}
</svg>
'''


def banner(theme):
    bg, fg, muted, accent, line = palette(theme)
    content = f'<rect width="1440" height="480" fill="{bg}"/>'
    # Quiet structured field on the right gives each mark room to read at README scale.
    for x in range(992, 1401, 48):
        for y in range(48, 440, 48):
            content += f'<rect x="{x}" y="{y}" width="2" height="2" fill="{line}"/>'
    content += f'<path d="M64 400H1376" stroke="{line}"/>'
    content += text(64, 64, 'Command-line clarity', 17, muted)
    content += f'<g transform="translate(64 131) scale(1.18)">{mark(accent)}</g>'
    content += f'<g transform="translate(260 143) scale(1.65)">{wordmark(fg)}</g>'
    content += text(64, 344, 'AI-first. JSON by default.', 30, fg)
    content += text(64, 439, 'Independent tooling for workflow automation', 17, muted)
    content += f'<g transform="translate(1040 96) scale(2.1)">{mark(accent)}</g>'
    return content


def social(theme):
    bg, fg, muted, accent, line = palette(theme)
    return (f'<rect width="800" height="800" fill="{bg}"/>'
            + f'<g transform="translate(240 104) scale(2.5)">{mark(accent)}</g>'
            + f'<g transform="translate(227 476) scale(1.9)">{wordmark(fg)}</g>'
            + text(400, 700, 'AI-first. JSON by default.', 23, muted, 'text-anchor="middle"'))


def main():
    for theme in ('light', 'dark'):
        bg, fg, muted, accent, line = palette(theme)
        items = [
            ('logo', 512, 512, f'<g transform="translate(64 64) scale(3)">{mark(accent)}</g>'),
            ('banner', 1440, 480, banner(theme)),
            ('social', 800, 800, social(theme)),
        ]
        for name, w, h, content in items:
            (ROOT / f'{name}-{theme}.svg').write_text(svg(w, h, f'8cli – Cut eight – {name}, {theme} theme', content))


if __name__ == '__main__':
    main()
