"""Turn the raw recordings in captures/ into the media the site serves.

Run from apps/website:  python scripts/process-captures.py
Needs Pillow and imageio-ffmpeg:  pip install pillow imageio-ffmpeg

  captures/modes/NN-name.mkv     ->  public/media/modes/<id>.mp4 (muted loop) + <id>.webp (poster)
  captures/deck-<name>.mkv       ->  public/media/deck/<name>.mp4 + <name>.webp ("Make it yours")
  captures/rooms/room-*.png      ->  public/media/rooms/<name>.webp and <name>-800.webp
  captures/study/study-*.png     ->  public/media/study/<name>.webp and <name>-800.webp (Focus Room)
  captures/rooms/room-01.png     ->  public/og.jpg (link preview card) and public/og-kissa-deck.png
"""
import subprocess
from pathlib import Path

import imageio_ffmpeg
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
CAPTURES = ROOT / 'captures'
MEDIA = ROOT / 'public' / 'media'
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()

# source file -> (id used by the site, seconds to skip at the start)
MODES = {
    '01-normal': ('normal', 0),
    '02-fullscreen': ('fullscreen', 0),
    '03-fullscreen-lyrics': ('fullscreen-lyrics', 11.5),  # skip the explicit lines at the start
    '04-screensaver': ('screensaver', 2.4),
    '05-screensaver-lyrics': ('screensaver-lyrics', 0),
    '06-crate': ('crate', 0),
    '07-shelf': ('shelf', 0),
}

# captures/deck-<name>.mkv -> public/media/deck/<name>
DECK = ['moving-light', 'editions']


def ffmpeg(*args):
    subprocess.run([FFMPEG, '-v', 'error', '-y', *args], check=True)


def clips(out, items):
    out.mkdir(parents=True, exist_ok=True)
    for clip, name, skip in items:
        if not clip.exists():
            print(f'skip {clip.name} (not recorded)')
            continue
        ffmpeg(
            '-ss', str(skip), '-i', str(clip), '-an',
            '-vf', 'scale=1280:720:flags=lanczos,fps=30,format=yuv420p',
            '-c:v', 'libx264', '-preset', 'slow', '-crf', '25',
            '-movflags', '+faststart', str(out / f'{name}.mp4'),
        )
        ffmpeg(
            '-ss', str(skip), '-i', str(clip), '-frames:v', '1',
            '-vf', 'scale=1280:720:flags=lanczos', '-quality', '80', str(out / f'{name}.webp'),
        )
        print(f'{name}.mp4  {(out / f"{name}.mp4").stat().st_size // 1024} KB')


def modes():
    clips(MEDIA / 'modes', [(CAPTURES / 'modes' / f'{s}.mkv', n, k) for s, (n, k) in MODES.items()])


def deck():
    clips(MEDIA / 'deck', [(CAPTURES / f'deck-{n}.mkv', n, 0) for n in DECK])


def stills(folder, pattern):
    out = MEDIA / folder
    out.mkdir(parents=True, exist_ok=True)
    for still in sorted((CAPTURES / folder).glob(pattern)):
        image = Image.open(still).convert('RGB')
        image.resize((1600, 900), Image.LANCZOS).save(out / f'{still.stem}.webp', quality=82, method=6)
        image.resize((800, 450), Image.LANCZOS).save(out / f'{still.stem}-800.webp', quality=80, method=6)
        print(f'{still.stem}.webp')


def social_card():
    still = CAPTURES / 'rooms' / 'room-01.png'
    if not still.exists():
        return
    image = Image.open(still).convert('RGB').resize((1200, 675), Image.LANCZOS)
    image.crop((0, 22, 1200, 652)).save(ROOT / 'public' / 'og.jpg', quality=86, optimize=True, progressive=True)
    Image.open(still).convert('RGB').resize((1920, 1080), Image.LANCZOS).save(ROOT / 'public' / 'og-kissa-deck.png', optimize=True)
    print('og.jpg, og-kissa-deck.png')


if __name__ == '__main__':
    modes()
    deck()
    stills('rooms', 'room-*.png')
    stills('study', 'study-*.png')
    social_card()
