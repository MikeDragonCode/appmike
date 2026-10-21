#!/usr/bin/env python3
"""Draws the images that depend on the palette: the app icon, splash, Android icons, favicon, the soft orange orbs
behind every screen, the deep orange gradient of the hero card and the fade under the status bar.
Run it after changing the colors in src/theme.ts.

    python3 scripts/make-images.py        (needs Pillow and numpy)
"""
import math
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parent.parent / 'assets' / 'images'

# Keep in step with src/theme.ts and app.json.
BG = (0xfb, 0xf8, 0xf5)
ORANGE = (0xe8, 0x70, 0x2a)  # work
APRICOT = (0xf2, 0xab, 0x80)  # rest
HERO_TOP = (0xa8, 0x36, 0x14)  # deep orange, darkest where the small text sits
HERO_BOTTOM = (0xcf, 0x53, 0x1d)
ORB = (0xe8, 0x70, 0x2a)

# Two orbs on a screen-shaped canvas (fractions of its width and height). A big one rising off the top right, a small
# one at the bottom left. `lit` moves the brightest point inside the orb, which is what makes it look round.
ORBS = [
    dict(cx=0.88, cy=0.10, r=0.56, strength=0.52, lit=(-0.32, 0.36)),
    dict(cx=0.00, cy=0.94, r=0.40, strength=0.44, lit=(0.30, -0.32)),
]
ASPECT = 0.46  # width / height of the canvas, about a modern phone


def orb_alpha(x, y, aspect: float = ASPECT):
    """Soft orbs over the canvas at (x, y), both given as fractions. Lower on the edge, brightest near `lit`."""
    total = np.zeros_like(x)
    for o in ORBS:
        dx = (x - o['cx']) / o['r']
        dy = (y - o['cy']) / (o['r'] * aspect)
        d = np.sqrt(dx * dx + dy * dy)  # 0 at the centre, 1 at the edge
        lx, ly = o['lit']
        lit = np.sqrt((dx - lx) ** 2 + (dy - ly) ** 2) / 1.1
        body = np.clip(1 - d, 0, 1) ** 0.8  # soft edge, no hard line
        core = np.clip(1 - lit, 0, 1) ** 1.4
        total = np.maximum(total, o['strength'] * body * (0.35 + 0.65 * core))
    return np.clip(total, 0, 1)


def orbs_png(path: Path) -> None:
    """The orbs, as a transparent PNG the size of a screen. Stretched over the whole screen behind everything."""
    w, h = 460, 1000
    y, x = np.mgrid[0:h, 0:w].astype(np.float64)
    a = orb_alpha((x + 0.5) / w, (y + 0.5) / h)
    a = np.clip(a + (np.random.default_rng(3).random((h, w)) - 0.5) * (3.0 / 255), 0, 1)  # no 8-bit bands
    rgba = np.zeros((h, w, 4), dtype=np.uint8)
    rgba[..., 0], rgba[..., 1], rgba[..., 2] = ORB
    rgba[..., 3] = np.round(a * 255).astype(np.uint8)
    Image.fromarray(rgba, 'RGBA').save(path)


def fade_png(path: Path) -> None:
    """The wall as it looks just under the status bar, fading to nothing downwards. Cards that scroll up
    dissolve into it instead of being cut off by a hard line. Stretched over a strip 16 points tall."""
    w, h = 256, 32
    just_below_status_bar = 0.075  # of the screen height
    x = (np.arange(w) + 0.5) / w
    a = orb_alpha(x, np.full_like(x, just_below_status_bar))
    wall = np.array(BG, dtype=np.float64) * (1 - a[:, None]) + np.array(ORB, dtype=np.float64) * a[:, None]
    t = (np.arange(h) + 0.5) / h
    opacity = 1 - t * t * (3 - 2 * t)  # smoothstep, so it eases in and out
    rgba = np.zeros((h, w, 4), dtype=np.uint8)
    rgba[..., :3] = np.round(wall)[None, :, :].astype(np.uint8)
    rgba[..., 3] = np.round(opacity * 255).astype(np.uint8)[:, None]
    Image.fromarray(rgba, 'RGBA').save(path)


def hero_png(path: Path) -> None:
    """The deep orange of the hero card: darker at the top, where the small text is, with a soft light orb in the corner."""
    w, h = 256, 256
    y, x = np.mgrid[0:h, 0:w].astype(np.float64)
    x, y = (x + 0.5) / w, (y + 0.5) / h
    top, bottom = np.array(HERO_TOP, dtype=np.float64), np.array(HERO_BOTTOM, dtype=np.float64)
    rgb = top * (1 - y[..., None]) + bottom * y[..., None]
    d = np.sqrt((x - 0.95) ** 2 + (y - 0.15) ** 2) / 0.65
    glow = np.clip(1 - d, 0, 1) ** 1.6 * 0.38
    rgb = rgb * (1 - glow[..., None]) + np.array((0xf0, 0x8a, 0x45), dtype=np.float64) * glow[..., None]
    rgb += (np.random.default_rng(4).random((h, w, 1)) - 0.5) * 1.5
    Image.fromarray(np.clip(np.round(rgb), 0, 255).astype(np.uint8), 'RGB').save(path)


SS = 4


def arc_mask(n: int, c: float, radius: float, width: float, centre_deg: float) -> Image.Image:
    m = Image.new('L', (n, n), 0)
    d = ImageDraw.Draw(m)
    ro, ri = radius + width / 2, radius - width / 2
    d.pieslice((c - ro, c - ro, c + ro, c + ro), centre_deg - 70, centre_deg + 70, fill=255)
    d.ellipse((c - ri, c - ri, c + ri, c + ri), fill=0)
    for a in (centre_deg - 70, centre_deg + 70):  # round caps
        x, y = c + radius * math.cos(math.radians(a)), c + radius * math.sin(math.radians(a))
        d.ellipse((x - width / 2, y - width / 2, x + width / 2, y + width / 2), fill=255)
    return m


def arcs(size: int, background, left, right, scale: float = 1.0) -> Image.Image:
    """The two arcs: work (left) and rest (right). `background` is an RGBA image, a colour, or None."""
    n = size * SS
    k = n / 1024 * scale
    c, radius, width = n / 2, 262 * k, 112 * k
    if isinstance(background, Image.Image):
        im = background.resize((n, n), Image.LANCZOS).convert('RGBA')
    else:
        im = Image.new('RGBA', (n, n), background if background else (0, 0, 0, 0))
    for colour, deg in ((left, 180), (right, 0)):
        im.paste(Image.new('RGBA', (n, n), colour + (255,)), (0, 0), arc_mask(n, c, radius, width, deg))
    return im.resize((size, size), Image.LANCZOS)


def orange_sky(size: int) -> Image.Image:
    """The icon background: the deep orange of the hero card, with a lighter orb glowing in a corner."""
    y, x = np.mgrid[0:size, 0:size].astype(np.float64)
    x, y = (x + 0.5) / size, (y + 0.5) / size
    t = np.clip((x * 0.35 + y * 0.65), 0, 1)
    rgb = np.array(HERO_TOP, dtype=np.float64) * (1 - t[..., None]) + np.array((0xe0, 0x62, 0x22), dtype=np.float64) * t[..., None]
    d = np.sqrt((x - 0.82) ** 2 + (y - 0.12) ** 2) / 0.8
    glow = np.clip(1 - d, 0, 1) ** 1.5 * 0.55
    rgb = rgb * (1 - glow[..., None]) + np.array((0xff, 0xa0, 0x5c), dtype=np.float64) * glow[..., None]
    return Image.fromarray(np.clip(np.round(rgb), 0, 255).astype(np.uint8), 'RGB')


WHITE = (255, 255, 255)

if __name__ == '__main__':
    OUT.mkdir(parents=True, exist_ok=True)
    orbs_png(OUT / 'orbs.png')
    fade_png(OUT / 'fade.png')
    hero_png(OUT / 'hero.png')
    arcs(1024, orange_sky(1024), WHITE, (0xff, 0xd2, 0xb0)).convert('RGB').save(OUT / 'icon.png')
    arcs(400, None, ORANGE, APRICOT, 0.95).save(OUT / 'splash-icon.png')
    arcs(48, orange_sky(48), WHITE, (0xff, 0xd2, 0xb0), 1.15).convert('RGB').save(OUT / 'favicon.png')
    arcs(512, None, WHITE, (0xff, 0xd2, 0xb0), 0.62).save(OUT / 'android-icon-foreground.png')
    orange_sky(512).convert('RGBA').save(OUT / 'android-icon-background.png')
    arcs(432, None, (255, 255, 255), (255, 255, 255), 0.62).save(OUT / 'android-icon-monochrome.png')
    print('wrote', ', '.join(sorted(p.name for p in OUT.glob('*.png'))))
