"""Generate the Microsoft Store (MSIX) tile and icon images from build/icon.png.

Run from apps/desktop:  python build/generate_store_assets.py

electron-builder packs every image in build/appx/ into the package's assets
folder. Windows picks the right file by its qualifiers:
  .scale-200                  high-DPI variant
  .targetsize-N               exact pixel size, for taskbar / Start list / Alt-Tab
  _altform-unplated           drawn without a coloured plate behind it
"""
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / 'icon.png'
OUT = ROOT / 'appx'

icon = Image.open(SOURCE).convert('RGBA')


def fit(size: int) -> Image.Image:
    return icon.resize((size, size), Image.LANCZOS)


def tile(width: int, height: int, fill: float) -> Image.Image:
    """The icon centred on a transparent canvas, occupying `fill` of the shorter side."""
    canvas = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    side = round(min(width, height) * fill)
    mark = fit(side)
    canvas.paste(mark, ((width - side) // 2, (height - side) // 2), mark)
    return canvas


def save(image: Image.Image, name: str) -> None:
    OUT.mkdir(exist_ok=True)
    image.save(OUT / name, optimize=True)
    print(f'  {name}  {image.width}x{image.height}')


print(f'Writing Store assets to {OUT}')

# Store listing logo
save(fit(50), 'StoreLogo.png')
save(fit(100), 'StoreLogo.scale-200.png')

# Start menu tiles — the mark sits inside the tile with breathing room
for base, name in ((150, 'Square150x150Logo'), (71, 'SmallTile'), (310, 'LargeTile')):
    save(tile(base, base, 0.66), f'{name}.png')
    save(tile(base * 2, base * 2, 0.66), f'{name}.scale-200.png')

save(tile(310, 150, 0.7), 'Wide310x150Logo.png')
save(tile(620, 300, 0.7), 'Wide310x150Logo.scale-200.png')

# App list / taskbar icon
save(fit(44), 'Square44x44Logo.png')
save(fit(88), 'Square44x44Logo.scale-200.png')
for size in (16, 24, 32, 48, 256):
    save(fit(size), f'Square44x44Logo.targetsize-{size}.png')
    save(fit(size), f'Square44x44Logo.targetsize-{size}_altform-unplated.png')
