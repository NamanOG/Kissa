"""Make the website's logo marks and favicons from the desktop app's icon artwork, so the site and the
Windows app show the same mark.

Run from apps/website:  python scripts/make-brand-marks.py   (needs Pillow)

The artwork lives in apps/desktop/build/generate_store_assets.py: the small-size version (three
clear waves, firmer copper ring, soft light edge) and the original detailed artwork. The logo beside
the wordmark is only 26-30 CSS px, so it always uses the small-size version, drawn at the exact
device-pixel size for each screen density (on a 2x or 3x screen the original's six hairline waves
and thin ring read as faint at that size). Nothing is rescaled by the browser:

  public/brand/kissa-mark-<px>.png   the logo beside the wordmark, for each CSS size the site uses
                                     (26 nav, 28 guides, 30 Support and 404) at 1x, 1.25x, 1.5x,
                                     2x and 3x (see src/lib/brandMark.ts)
  public/brand/favicon-<px>.png      browser tab icons, 16-48 px
  public/favicon.ico                 the same tab sizes, for clients that ask for /favicon.ico

public/favicon.png (180 px, the original artwork) stays as the apple-touch-icon.
"""
import sys

sys.dont_write_bytecode = True  # importing the desktop script must not leave __pycache__ in apps/desktop/build
from pathlib import Path

WEBSITE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(WEBSITE.parent / 'desktop' / 'build'))
from generate_store_assets import mark, small_mark  # noqa: E402

OUT = WEBSITE / 'public' / 'brand'
CSS_SIZES = (26, 28, 30)
DENSITIES = (1, 1.25, 1.5, 2, 3)
FAVICON_SIZES = (16, 20, 24, 32, 48)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    made = {}
    for css in CSS_SIZES:
        for d in DENSITIES:
            px = round(css * d)
            if px not in made:
                made[px] = small_mark(px)
                made[px].save(OUT / f'kissa-mark-{px}.png', optimize=True)
    print('marks:', ', '.join(str(p) for p in sorted(made)))

    tab = [mark(px) for px in FAVICON_SIZES]
    for px, image in zip(FAVICON_SIZES, tab):
        image.save(OUT / f'favicon-{px}.png', optimize=True)
    tab[-1].save(WEBSITE / 'public' / 'favicon.ico', format='ICO', sizes=[i.size for i in tab], append_images=tab[:-1])
    print('favicons:', ', '.join(str(p) for p in FAVICON_SIZES), '+ favicon.ico')


if __name__ == '__main__':
    main()
