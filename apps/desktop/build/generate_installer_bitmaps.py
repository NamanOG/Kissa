import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageEnhance

build_dir = os.path.dirname(os.path.abspath(__file__))
media_dir = os.path.join(build_dir, "..", "src", "renderer", "src", "media")
hero_path = os.path.join(media_dir, "kissa_welcome_hero.jpg")
logo_path = os.path.join(media_dir, "phono_logo.png")

# 1. Generate installerSidebar.bmp (164 x 314)
sidebar_w, sidebar_h = 164, 314
sidebar = Image.new("RGB", (sidebar_w, sidebar_h), "#13100e")

if os.path.exists(hero_path):
    hero = Image.open(hero_path).convert("RGB")
    hero_w, hero_h = hero.size
    crop_h = int(hero_w / (sidebar_w / 160.0))
    hero_cropped = hero.crop((0, 0, hero_w, min(hero_h, crop_h)))
    hero_resized = hero_cropped.resize((sidebar_w, 160), Image.Resampling.LANCZOS)
    
    enhancer = ImageEnhance.Color(hero_resized)
    hero_resized = enhancer.enhance(0.85)
    
    sidebar.paste(hero_resized, (0, 0))

# Smooth gradient fade into #13100e
draw = ImageDraw.Draw(sidebar)
for y in range(70, 165):
    alpha = min(1.0, max(0.0, (y - 70) / 95.0))
    for x in range(sidebar_w):
        current = sidebar.getpixel((x, y))
        blended = (
            int(current[0] * (1 - alpha) + 19 * alpha),
            int(current[1] * (1 - alpha) + 16 * alpha),
            int(current[2] * (1 - alpha) + 14 * alpha),
        )
        sidebar.putpixel((x, y), blended)

try:
    font_large = ImageFont.truetype("georgia.ttf", 22)
    font_sub = ImageFont.truetype("arial.ttf", 9)
    font_jp = ImageFont.truetype("msgothic.ttc", 10)
    font_tiny = ImageFont.truetype("arial.ttf", 8)
except:
    font_large = ImageFont.load_default()
    font_sub = ImageFont.load_default()
    font_jp = ImageFont.load_default()
    font_tiny = ImageFont.load_default()

# Gold accent line
draw.rectangle([20, 180, 45, 181], fill="#d7a76c")

# Text labels
draw.text((20, 190), "喫茶 · JAZZ KISSA", fill="#d7a76c", font=font_jp)
draw.text((20, 208), "Kissa", fill="#f5efe6", font=font_large)
draw.text((20, 238), "Contemplative Desktop\nVinyl Environment", fill="#9c8e82", font=font_sub)

# Bottom hardware tag
draw.line([20, 288, sidebar_w - 20, 288], fill="#251f1b")
draw.text((20, 294), "ANALOG HI-FI INTERFACE", fill="#635548", font=font_tiny)

sidebar.save(os.path.join(build_dir, "installerSidebar.bmp"), "BMP")
sidebar.save(os.path.join(build_dir, "uninstallerSidebar.bmp"), "BMP")
print("Saved installerSidebar.bmp and uninstallerSidebar.bmp")

# 2. Generate installerHeader.bmp (150 x 57)
header_w, header_h = 150, 57
header = Image.new("RGB", (header_w, header_h), "#13100e")
draw_h = ImageDraw.Draw(header)

for x in range(header_w):
    factor = x / float(header_w)
    r = int(19 + (26 - 19) * factor)
    g = int(16 + (22 - 16) * factor)
    b = int(14 + (19 - 14) * factor)
    draw_h.line([(x, 0), (x, header_h)], fill=(r, g, b))

if os.path.exists(logo_path):
    logo = Image.open(logo_path).convert("RGBA")
    logo = logo.resize((36, 36), Image.Resampling.LANCZOS)
    header.paste(logo, (header_w - 44, (header_h - 36) // 2), logo)

try:
    font_h_title = ImageFont.truetype("georgia.ttf", 14)
    font_h_sub = ImageFont.truetype("msgothic.ttc", 8)
except:
    font_h_title = ImageFont.load_default()
    font_h_sub = ImageFont.load_default()

draw_h.text((12, 12), "Kissa", fill="#f5efe6", font=font_h_title)
draw_h.text((12, 33), "喫茶 · JAZZ KISSA", fill="#d7a76c", font=font_h_sub)

header.save(os.path.join(build_dir, "installerHeader.bmp"), "BMP")
print("Saved installerHeader.bmp")
