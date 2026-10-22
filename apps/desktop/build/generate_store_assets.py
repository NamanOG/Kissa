"""Generate Kissa's Windows icons from build/icon.png: the Microsoft Store (MSIX) tile and icon
images in build/appx/ and the classic build's build/icon.ico.

Run from apps/desktop:  python build/generate_store_assets.py   (needs Pillow)
To preview without touching the repo:  python build/generate_store_assets.py --out <folder>
Only the in-app marks (window, tray, sidebar):  python build/generate_store_assets.py --in-app

Two versions of the mark, chosen by the size it is drawn at:
  above 48 px   the original artwork (icon.png), resized.
  48 px & below the "small-size" version: the same artwork with its six hairline teal waves
                replaced by three clearer ones, a firmer copper ring, and a soft light edge so the
                record's outline holds on dark backgrounds (Search, Start, taskbar in dark mode).
                Its strokes are drawn at the exact output size, at least one pixel wide.

electron-builder packs every image in build/appx/ into the package's assets folder. Windows picks
the right file by its qualifiers:
  .scale-N                    display-scale variant (100% is the unqualified file)
  .targetsize-N               exact pixel size, for Search, Start, the taskbar and Alt-Tab.
                              Without an exact match Windows shrinks the next larger file, which
                              blurs it, so every size Windows asks for at 100-200% is provided.
  _altform-unplated           drawn without the coloured plate behind it

The classic (NSIS / portable) build takes its executable and shortcut icon from build/icon.ico,
which holds the same sizes as PNG frames. The running app's window and tray icon use the same ICO
from resources/, and the sidebar mark is exported into the renderer's assets (write_in_app).
"""
import math
import sys
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / 'icon.png'
OUT = ROOT / 'appx'
ICO = ROOT / 'icon.ico'
APP_ICO = ROOT.parent / 'resources' / 'icon.ico'
RENDERER_MARKS = ROOT.parent / 'src' / 'renderer' / 'src' / 'assets' / 'brand'
# Sidebar Deck button: the image is 26 or 30 CSS px (inside a 28/32 px ring with a 1 px border), at
# 1x, 1.25x, 1.5x, 2x and 3x (see src/renderer/src/utils/brandMark.ts)
SIDEBAR_MARK_SIZES = (26, 30, 33, 38, 39, 45, 52, 60, 78, 90)
if '--out' in sys.argv:
    _preview = Path(sys.argv[sys.argv.index('--out') + 1]).resolve()
    OUT, ICO = _preview / 'appx', _preview / 'icon.ico'
    APP_ICO, RENDERER_MARKS = _preview / 'resources' / 'icon.ico', _preview / 'renderer-brand'
    _preview.mkdir(parents=True, exist_ok=True)

SMALL_MAX = 48  # marks this size or smaller use the small-size version
SUPERSAMPLE = 8  # the small-size strokes are drawn this much larger, then reduced

TARGET_SIZES = (16, 20, 24, 30, 32, 36, 40, 48, 60, 64, 72, 80, 96, 256)
ICO_SIZES = (16, 20, 24, 30, 32, 36, 40, 48, 60, 64, 72, 80, 96, 128, 256)

icon = Image.open(SOURCE).convert('RGBA')
assert icon.size == (512, 512), 'the drawing below is laid out on the 512 px master'


# --- Small-size version --------------------------------------------------------------------------

def _without_waves(art: Image.Image) -> Image.Image:
    """The master with its teal hairlines painted out to the record's black."""
    art = art.copy()
    px = art.load()
    mask = Image.new('L', art.size, 0)
    m = mask.load()
    for y in range(art.height):
        for x in range(art.width):
            r, g, b, a = px[x, y]
            if a > 100 and b > r + 12 and g > r + 6:
                m[x, y] = 255
    from PIL import ImageFilter
    mask = mask.filter(ImageFilter.MaxFilter(5))
    black = Image.new('RGBA', art.size, (9, 9, 9, 255))
    black.putalpha(art.getchannel('A'))
    return Image.composite(black, art, mask)


ICON_WITHOUT_WAVES = _without_waves(icon)


def _gradient(size: int, stops, diagonal: bool) -> Image.Image:
    """RGB gradient across the square, left to right (or top-left to bottom-right)."""
    line = Image.new('RGB', (256, 1))
    lp = line.load()
    for i in range(256):
        t = i / 255
        for (t0, c0), (t1, c1) in zip(stops, stops[1:]):
            if t0 <= t <= t1:
                k = (t - t0) / (t1 - t0) if t1 > t0 else 0
                lp[i, 0] = tuple(round(c0[j] + (c1[j] - c0[j]) * k) for j in range(3))
                break
    if not diagonal:
        return line.resize((size, size), Image.BILINEAR)
    big = line.resize((size * 2, size * 2), Image.BILINEAR).rotate(-45, resample=Image.BILINEAR)
    o = size // 2
    return big.crop((o, o, o + size, o + size))


def _hex(h: str):
    return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5))


TEAL = [(0, _hex('#2f97a1')), (0.5, _hex('#46b9c2')), (1, _hex('#2f97a1'))]
COPPER = [(0, _hex('#d49a66')), (0.55, _hex('#a06438')), (1, _hex('#8a5530'))]
EDGE = _hex('#9a8270')


def _layer(colour: Image.Image, mask: Image.Image, n: int, opacity: float = 1.0) -> Image.Image:
    """Reduce a supersampled mask to n px and use it as the alpha of `colour`."""
    alpha = mask.reduce(SUPERSAMPLE)
    if opacity < 1:
        alpha = alpha.point(lambda v: round(v * opacity))
    rgba = colour.resize((n, n), Image.BILINEAR).convert('RGBA')
    rgba.putalpha(alpha)
    return rgba


def small_mark(n: int) -> Image.Image:
    m = n * SUPERSAMPLE
    k = m / 512  # supersampled px per design unit
    u = 512 / n  # design units per output px
    tiny = n <= 20

    def stroke(px_out: float, minimum: float) -> float:  # width in design units, never under one output px
        return max(px_out * u, minimum)

    out = ICON_WITHOUT_WAVES.resize((n, n), Image.LANCZOS)

    # Waves: two or three, clipped inside the copper ring
    ring_w = stroke(1.0, 9)
    clip_r = 226 - ring_w / 2 - stroke(0.8, 8)
    waves = Image.new('L', (m, m), 0)
    dw = ImageDraw.Draw(waves)
    count, gap, top = (2, 46, 304) if tiny else (3, 36, 298)
    width = stroke(1.15 if tiny else 0.95, 7) * k
    for i in range(count):
        pts = [(x * k, (top + 38 + i * gap - 38 * math.cos(2 * math.pi * (x - 122) / 390)) * k)
               for x in range(40, 481, 4)]
        dw.line(pts, fill=255, width=max(1, round(width)), joint='curve')
    clip = Image.new('L', (m, m), 0)
    ImageDraw.Draw(clip).ellipse([(256 - clip_r) * k, (256 - clip_r) * k, (256 + clip_r) * k, (256 + clip_r) * k], fill=255)
    waves = Image.composite(waves, clip.point(lambda v: 0), clip)
    out.alpha_composite(_layer(_gradient(m, TEAL, diagonal=False), waves, n))

    # Copper ring, centred on the master's ring (r 226)
    ring = Image.new('L', (m, m), 0)
    r_out = (226 + ring_w / 2) * k
    ImageDraw.Draw(ring).ellipse([256 * k - r_out, 256 * k - r_out, 256 * k + r_out, 256 * k + r_out],
                                 outline=255, width=max(1, round(ring_w * k)))
    out.alpha_composite(_layer(_gradient(m, COPPER, diagonal=True), ring, n))

    # Soft light edge on the record's perimeter
    edge = Image.new('L', (m, m), 0)
    r_edge = 254 * k
    ImageDraw.Draw(edge).ellipse([256 * k - r_edge, 256 * k - r_edge, 256 * k + r_edge, 256 * k + r_edge],
                                 outline=255, width=max(1, round(u * k)))
    out.alpha_composite(_layer(Image.new('RGB', (m, m), EDGE), edge, n, opacity=0.5))
    return out


# --- Output --------------------------------------------------------------------------------------

def mark(size: int) -> Image.Image:
    """The icon at `size` px, in the version meant for that size."""
    if size <= SMALL_MAX:
        return small_mark(size)
    return icon.resize((size, size), Image.LANCZOS)


def tile(width: int, height: int, fill: float) -> Image.Image:
    """The icon centred on a transparent canvas, occupying `fill` of the shorter side."""
    canvas = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    side = round(min(width, height) * fill)
    m = mark(side)
    canvas.paste(m, ((width - side) // 2, (height - side) // 2), m)
    return canvas


def save(image: Image.Image, name: str) -> None:
    OUT.mkdir(exist_ok=True)
    image.save(OUT / name, optimize=True)
    print(f'  {name}  {image.width}x{image.height}')


def write_package() -> None:
    print(f'Writing Store assets to {OUT}')

    # Store listing logo
    save(mark(50), 'StoreLogo.png')
    save(mark(100), 'StoreLogo.scale-200.png')

    # Start menu tiles: the mark sits inside the tile with breathing room
    for base, name in ((150, 'Square150x150Logo'), (71, 'SmallTile'), (310, 'LargeTile')):
        save(tile(base, base, 0.66), f'{name}.png')
        save(tile(base * 2, base * 2, 0.66), f'{name}.scale-200.png')

    save(tile(310, 150, 0.7), 'Wide310x150Logo.png')
    save(tile(620, 300, 0.7), 'Wide310x150Logo.scale-200.png')

    # App list, Search, taskbar and Alt-Tab icon
    save(mark(44), 'Square44x44Logo.png')
    for scale in (125, 150, 200, 400):
        save(mark(round(44 * scale / 100)), f'Square44x44Logo.scale-{scale}.png')
    for size in TARGET_SIZES:
        image = mark(size)
        save(image, f'Square44x44Logo.targetsize-{size}.png')
        save(image, f'Square44x44Logo.targetsize-{size}_altform-unplated.png')

    # Classic build: executable, shortcut and installer icon
    frames = [mark(size) for size in ICO_SIZES]
    frames[-1].save(ICO, format='ICO', sizes=[f.size for f in frames], append_images=frames[:-1])
    print(f'Wrote {ICO.name}  {", ".join(str(s) for s in ICO_SIZES)}')


def write_in_app() -> None:
    """Marks the running app draws itself.

    resources/icon.ico     window icon (taskbar and Alt-Tab when not packaged) and tray icon; Windows
                           picks the frame for the display scale (tray 16-32, window 16-256).
    renderer brand marks   the sidebar's Deck button (26 or 30 CSS px), at 1x-3x, always the
                           small-size version because it is shown that small at every density.
    """
    APP_ICO.parent.mkdir(parents=True, exist_ok=True)
    frames = [mark(size) for size in ICO_SIZES]
    frames[-1].save(APP_ICO, format='ICO', sizes=[f.size for f in frames], append_images=frames[:-1])
    print(f'Wrote {APP_ICO}')
    RENDERER_MARKS.mkdir(parents=True, exist_ok=True)
    for px in SIDEBAR_MARK_SIZES:
        small_mark(px).save(RENDERER_MARKS / f'kissa-mark-{px}.png', optimize=True)
    print(f'Wrote sidebar marks {", ".join(str(p) for p in SIDEBAR_MARK_SIZES)} to {RENDERER_MARKS}')


if __name__ == '__main__':
    if '--in-app' not in sys.argv:
        write_package()
    write_in_app()
