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

# Keep in step with src/theme.ts and app.json. Every colour here was sampled from the reference pictures.
BG = (0xe5, 0xe5, 0xe0)
CREAM = (0xe4, 0xdf, 0xcc)
ORANGE = (0xeb, 0x71, 0x2e)  # work
AMBER = (0xf0, 0xb8, 0x46)  # rest
RED = (0xd1, 0x2d, 0x20)
DEEP = (0xd8, 0x5f, 0x29)  # the orange at the foot of the hero card

# Two orbs on a screen-shaped canvas (fractions of its width and height). A big orange one rising off the top right, a
# smaller amber one at the bottom left. `lit` moves the brightest point inside the orb, which is what makes it look round.
ORBS = [
    dict(cx=0.88, cy=0.10, r=0.56, strength=0.62, lit=(-0.32, 0.36), color=ORANGE),
    dict(cx=0.00, cy=0.94, r=0.42, strength=0.62, lit=(0.30, -0.32), color=AMBER),
]
ASPECT = 0.46  # width / height of the canvas, about a modern phone


def orbs_layer(x, y, aspect: float = ASPECT):
    """Soft orbs over the canvas at (x, y), both given as fractions: the opacity and the colour at each point."""
    total = np.zeros_like(x)
    colour = np.zeros(x.shape + (3,))
    for o in ORBS:
        dx = (x - o['cx']) / o['r']
        dy = (y - o['cy']) / (o['r'] * aspect)
        d = np.sqrt(dx * dx + dy * dy)  # 0 at the centre, 1 at the edge
        lx, ly = o['lit']
        lit = np.sqrt((dx - lx) ** 2 + (dy - ly) ** 2) / 1.1
        body = np.clip(1 - d, 0, 1) ** 0.8  # soft edge, no hard line
        core = np.clip(1 - lit, 0, 1) ** 1.4
        a = o['strength'] * body * (0.35 + 0.65 * core)
        colour += a[..., None] * np.array(o['color'], dtype=np.float64)
        total += a
    total_safe = np.where(total > 1e-6, total, 1.0)
    return np.clip(total, 0, 1), colour / total_safe[..., None]


def orbs_png(path: Path) -> None:
    """The orbs, as a transparent PNG the size of a screen. Stretched over the whole screen behind everything."""
    w, h = 460, 1000
    y, x = np.mgrid[0:h, 0:w].astype(np.float64)
    a, rgb = orbs_layer((x + 0.5) / w, (y + 0.5) / h)
    a = np.clip(a + (np.random.default_rng(3).random((h, w)) - 0.5) * (3.0 / 255), 0, 1)  # no 8-bit bands
    rgba = np.zeros((h, w, 4), dtype=np.uint8)
    rgba[..., :3] = np.round(rgb).astype(np.uint8)
    rgba[..., 3] = np.round(a * 255).astype(np.uint8)
    Image.fromarray(rgba, 'RGBA').save(path)


def fade_png(path: Path) -> None:
    """The wall as it looks just under the status bar, fading to nothing downwards. Cards that scroll up
    dissolve into it instead of being cut off by a hard line. Stretched over a strip 16 points tall."""
    w, h = 256, 32
    just_below_status_bar = 0.075  # of the screen height
    x = (np.arange(w) + 0.5) / w
    a, rgb = orbs_layer(x, np.full_like(x, just_below_status_bar))
    wall = np.array(BG, dtype=np.float64) * (1 - a[:, None]) + rgb * a[:, None]
    t = (np.arange(h) + 0.5) / h
    opacity = 1 - t * t * (3 - 2 * t)  # smoothstep, so it eases in and out
    rgba = np.zeros((h, w, 4), dtype=np.uint8)
    rgba[..., :3] = np.round(wall)[None, :, :].astype(np.uint8)
    rgba[..., 3] = np.round(opacity * 255).astype(np.uint8)[:, None]
    Image.fromarray(rgba, 'RGBA').save(path)


def red_to_orange(x, y):
    """Red in the top left corner running into orange, with an orange glow in the top right: the hero card and the icon."""
    t = np.clip(x * 0.3 + y * 0.7, 0, 1)[..., None]
    rgb = np.array(RED, dtype=np.float64) * (1 - t) + np.array(DEEP, dtype=np.float64) * t
    d = np.sqrt((x - 0.98) ** 2 + (y - 0.1) ** 2) / 0.7
    glow = (np.clip(1 - d, 0, 1) ** 1.5 * 0.55)[..., None]
    return rgb * (1 - glow) + np.array(ORANGE, dtype=np.float64) * glow


def hero_png(path: Path) -> None:
    """The deep red-orange of the hero card."""
    w, h = 256, 256
    y, x = np.mgrid[0:h, 0:w].astype(np.float64)
    rgb = red_to_orange((x + 0.5) / w, (y + 0.5) / h)
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
    """The icon background: the hero card's red running into orange."""
    y, x = np.mgrid[0:size, 0:size].astype(np.float64)
    rgb = red_to_orange((x + 0.5) / size, (y + 0.5) / size)
    return Image.fromarray(np.clip(np.round(rgb), 0, 255).astype(np.uint8), 'RGB')



if __name__ == '__main__':
    OUT.mkdir(parents=True, exist_ok=True)
    orbs_png(OUT / 'orbs.png')
    fade_png(OUT / 'fade.png')
    hero_png(OUT / 'hero.png')
    arcs(1024, orange_sky(1024), CREAM, AMBER).convert('RGB').save(OUT / 'icon.png')
    arcs(400, None, ORANGE, AMBER, 0.95).save(OUT / 'splash-icon.png')
    arcs(48, orange_sky(48), CREAM, AMBER, 1.15).convert('RGB').save(OUT / 'favicon.png')
    arcs(512, None, CREAM, AMBER, 0.62).save(OUT / 'android-icon-foreground.png')
    orange_sky(512).convert('RGBA').save(OUT / 'android-icon-background.png')
    arcs(432, None, (255, 255, 255), (255, 255, 255), 0.62).save(OUT / 'android-icon-monochrome.png')
    print('wrote', ', '.join(sorted(p.name for p in OUT.glob('*.png'))))
