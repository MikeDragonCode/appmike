#!/usr/bin/env python3
"""Draws the images that depend on the palette: app icon, splash, Android icons, favicon, the lamp glow
behind every screen and the fade under the status bar. Run it after changing the colors in src/theme.ts.

    python3 scripts/make-images.py        (needs Pillow and numpy)
"""
import math
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parent.parent / 'assets' / 'images'

# Keep in step with src/theme.ts and app.json.
BG = (0x2a, 0x23, 0x1d)
AMBER = (0xf0, 0xb2, 0x66)
SAGE = (0xb4, 0xc9, 0xa2)
LAMP = (255, 201, 138)  # colour of the light
LAMP_STRENGTH = 0.16  # how strongly the light lifts the wall at its brightest


def falloff(x, y, cx: float, cy: float, rx: float, ry: float, strength: float):
    """Soft elliptical falloff, 0..strength, at the position (x, y) given as fractions of the picture."""
    return strength * np.exp(-(((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2) * 1.6)


# The shape of the light on a screen. The lamp picture and the status bar fade must agree on it.
SCREEN_LIGHT = dict(cx=0.5, cy=0.0, rx=0.62, ry=0.80, strength=LAMP_STRENGTH)


def glow_alpha(w: int, h: int, cx: float, cy: float, rx: float, ry: float, strength: float, seed: int = 1) -> np.ndarray:
    """The falloff over a w x h picture, with a touch of noise so 8-bit steps do not show as bands."""
    y, x = np.mgrid[0:h, 0:w].astype(np.float64)
    a = falloff(x / w, y / h, cx, cy, rx, ry, strength)
    rng = np.random.default_rng(seed)
    return np.clip(a + (rng.random((h, w)) - 0.5) * (1.0 / 255), 0, 1)


def lamp_png(path: Path) -> None:
    """Lamp light falling from the top of the screen. Transparent PNG, stretched over the top of each screen."""
    w, h = 256, 512
    a = glow_alpha(w, h, **SCREEN_LIGHT)
    rgba = np.zeros((h, w, 4), dtype=np.uint8)
    rgba[..., 0], rgba[..., 1], rgba[..., 2] = LAMP
    rgba[..., 3] = np.round(a * 255).astype(np.uint8)
    Image.fromarray(rgba, 'RGBA').save(path)


def fade_png(path: Path) -> None:
    """The wall as it looks just under the status bar, fading to nothing downwards. Cards that scroll up
    dissolve into it instead of being cut off by a hard line. Stretched over a strip 16 points tall."""
    w, h = 256, 32
    just_below_status_bar = 0.10  # of the lamp picture's height; the glow barely changes over this distance
    x = (np.arange(w) + 0.5) / w
    a = falloff(x, just_below_status_bar, **SCREEN_LIGHT)
    wall = np.array(BG, dtype=np.float64) * (1 - a[:, None]) + np.array(LAMP, dtype=np.float64) * a[:, None]
    t = (np.arange(h) + 0.5) / h
    opacity = 1 - t * t * (3 - 2 * t)  # smoothstep, so it eases in and out
    rgba = np.zeros((h, w, 4), dtype=np.uint8)
    rgba[..., :3] = np.round(wall)[None, :, :].astype(np.uint8)
    rgba[..., 3] = np.round(opacity * 255).astype(np.uint8)[:, None]
    Image.fromarray(rgba, 'RGBA').save(path)


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


def lit_wall(size: int) -> Image.Image:
    """Flat wall colour with the lamp glow at the top: the icon background."""
    a = glow_alpha(size, size, cx=0.5, cy=0.0, rx=0.75, ry=0.9, strength=LAMP_STRENGTH * 1.4)
    wall = np.zeros((size, size, 3), dtype=np.float64)
    wall[:] = BG
    light = np.array(LAMP, dtype=np.float64)
    rgb = wall * (1 - a[..., None]) + light * a[..., None]
    return Image.fromarray(np.clip(np.round(rgb), 0, 255).astype(np.uint8), 'RGB')


if __name__ == '__main__':
    OUT.mkdir(parents=True, exist_ok=True)
    lamp_png(OUT / 'lamp.png')
    fade_png(OUT / 'fade.png')
    arcs(1024, lit_wall(1024), AMBER, SAGE).convert('RGB').save(OUT / 'icon.png')
    arcs(400, None, AMBER, SAGE, 0.95).save(OUT / 'splash-icon.png')
    arcs(48, lit_wall(48), AMBER, SAGE, 1.15).convert('RGB').save(OUT / 'favicon.png')
    arcs(512, None, AMBER, SAGE, 0.62).save(OUT / 'android-icon-foreground.png')
    lit_wall(512).convert('RGBA').save(OUT / 'android-icon-background.png')
    arcs(432, None, (255, 255, 255), (255, 255, 255), 0.62).save(OUT / 'android-icon-monochrome.png')
    print('wrote', ', '.join(sorted(p.name for p in OUT.glob('*.png'))))
