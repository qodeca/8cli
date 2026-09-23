#!/usr/bin/env python3
# SPDX-License-Identifier: GPL-3.0-only
# SPDX-FileCopyrightText: 2026 Qodeca sp. z o.o.
"""Regenerate original SVG candidates. Python standard library only."""
from pathlib import Path
from html import escape

ROOT = Path(__file__).resolve().parent
DIRECTIONS = [
    ('prompt-eight', 'Prompt eight', 'A terminal prompt, built into an eight.', '#087B68', '#65E7C2'),
    ('json-frame', 'JSON frame', 'Structured by default. Ready for agents.', '#3558CF', '#99B5FF'),
    ('cut-eight', 'Cut eight', 'One precise mark. Many possible workflows.', '#9A5800', '#FFCA75'),
]


def text(x, y, value, size, color, extra=''):
    return f'<text x="{x}" y="{y}" font-family="Menlo,Consolas,monospace" font-size="{size}" fill="{color}" {extra}>{escape(value)}</text>'


def palette(d, theme):
    return ('#F6F8FA', '#17232F', '#526171', d[3], '#DFE6EB') if theme == 'light' else ('#101820', '#F1F6FA', '#AAB9C7', d[4], '#2C3B48')


def mark(kind, color):
    # Every mark is composed on a 128 × 128 grid; no fonts or external paths.
    if kind == 'prompt-eight':
        return f'''<g fill="none" stroke="{color}" stroke-width="10" stroke-linejoin="round" stroke-linecap="square">
<path d="M30 16H88L108 36V50L94 64L108 78V92L88 112H30L16 98V78L30 64L16 50V30Z"/>
<path d="M44 37L58 48L44 59M44 73L58 84L44 95M76 95H85"/>
</g>'''
    if kind == 'json-frame':
        return f'''<g fill="none" stroke="{color}" stroke-width="9" stroke-linecap="square" stroke-linejoin="round">
<path d="M36 18H27V49Q27 64 14 64Q27 64 27 79V110H36M92 18H101V49Q101 64 114 64Q101 64 101 79V110H92"/>
<rect x="49" y="28" width="30" height="30" rx="5"/><rect x="49" y="70" width="30" height="30" rx="5"/>
</g>'''
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


def banner(d, theme):
    bg, fg, muted, accent, line = palette(d, theme)
    kind = d[0]
    content = f'<rect width="1440" height="480" fill="{bg}"/>'
    # Quiet structured field on the right gives each mark room to read at README scale.
    for x in range(992, 1401, 48):
        for y in range(48, 440, 48):
            content += f'<rect x="{x}" y="{y}" width="2" height="2" fill="{line}"/>'
    content += f'<path d="M64 400H1376" stroke="{line}"/>'
    content += text(64, 64, 'Command-line clarity', 17, muted)
    content += f'<g transform="translate(64 131) scale(1.18)">{mark(kind, accent)}</g>'
    content += f'<g transform="translate(260 143) scale(1.65)">{wordmark(fg)}</g>'
    content += text(64, 344, 'AI-first. JSON by default.', 30, fg)
    content += text(64, 439, 'Independent tooling for workflow automation', 17, muted)
    content += f'<g transform="translate(1040 96) scale(2.1)">{mark(kind, accent)}</g>'
    return content


def social(d, theme):
    bg, fg, muted, accent, line = palette(d, theme)
    return (f'<rect width="800" height="800" fill="{bg}"/>'
            + f'<g transform="translate(240 104) scale(2.5)">{mark(d[0], accent)}</g>'
            + f'<g transform="translate(227 476) scale(1.9)">{wordmark(fg)}</g>'
            + text(400, 700, 'AI-first. JSON by default.', 23, muted, 'text-anchor="middle"'))


def main():
    for d in DIRECTIONS:
        folder = ROOT / d[0]
        folder.mkdir(exist_ok=True)
        for theme in ('light', 'dark'):
            bg, fg, muted, accent, line = palette(d, theme)
            items = [
                ('logo', 512, 512, f'<g transform="translate(64 64) scale(3)">{mark(d[0], accent)}</g>'),
                ('banner', 1440, 480, banner(d, theme)),
                ('social', 800, 800, social(d, theme)),
            ]
            for name, w, h, content in items:
                (folder / f'{name}-{theme}.svg').write_text(svg(w, h, f'8cli – {d[1]} – {name}, {theme} theme', content))
    sheet = '<rect width="1800" height="1420" fill="#E7EDF1"/>'
    sheet += text(48, 65, '8cli / Three directions', 32, '#17232F')
    sheet += text(48, 101, 'Candidate artwork – owner selection pending', 18, '#526171')
    for i, d in enumerate(DIRECTIONS):
        x = 48 + i * 576
        sheet += text(x, 156, f'0{i+1} / {d[1]}', 24, '#17232F')
        sheet += text(x, 187, d[2], 13, '#526171')
        for row, theme in enumerate(('light', 'dark')):
            y = 212 + row * 570
            bg, fg, muted, accent, line = palette(d, theme)
            sheet += f'<g transform="translate({x} {y})"><rect width="552" height="544" rx="16" fill="{bg}"/>'
            sheet += text(24, 40, theme.capitalize(), 15, muted)
            sheet += f'<g transform="translate(188 67) scale(1.375)">{mark(d[0], accent)}</g>'
            sheet += f'<g transform="translate(186 273)">{wordmark(fg)}</g>'
            sheet += f'<svg x="36" y="370" width="480" height="160" viewBox="0 0 1440 480">{banner(d, theme)}</svg>'
            sheet += '</g>'
    sheet += text(48, 1390, 'Each direction includes a transparent mark, a wide banner and a square social image in SVG + PNG.', 17, '#526171')
    (ROOT / 'preview-sheet.svg').write_text(svg(1800, 1420, '8cli – three unselected logo directions in light and dark themes', sheet))


if __name__ == '__main__':
    main()
