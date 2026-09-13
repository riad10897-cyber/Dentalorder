#!/usr/bin/env python3
"""One-off PWA icon generator. Draws a simple tooth glyph on the app's
accent-lime background at every size the manifest/iOS/favicon need.
Not a runtime dependency — run once, commit the PNGs, delete this if
the art is ever replaced by a real designer."""

from PIL import Image, ImageDraw

BG = (200, 240, 74, 255)  # --accent, opaque (iOS ignores alpha and fills black otherwise)
TOOTH = (14, 14, 17, 255)  # --bg


def draw_tooth(size: int) -> Image.Image:
    img = Image.new("RGBA", (size, size), BG)
    draw = ImageDraw.Draw(img)

    # Background: rounded square (maskable-safe padding baked in).
    pad = size * 0.06
    draw.rounded_rectangle(
        [pad, pad, size - pad, size - pad], radius=size * 0.22, fill=BG
    )

    # Tooth glyph, centered: a rounded crown with two short roots below,
    # like a simple line-icon molar. Deliberately blocky/simple.
    cx = size / 2
    crown_half_w = size * 0.15
    crown_top = size * 0.27
    crown_h = size * 0.20
    crown_bottom = crown_top + crown_h

    root_w = size * 0.075
    root_h = size * 0.20
    root_gap = size * 0.03  # half-gap between the two roots at the center
    root_bottom = crown_bottom + root_h

    for dx in (-1, 1):
        root_cx = cx + dx * (root_gap + root_w / 2)
        draw.rounded_rectangle(
            [root_cx - root_w / 2, crown_bottom - size * 0.02, root_cx + root_w / 2, root_bottom],
            radius=root_w / 2,
            fill=TOOTH,
        )

    draw.rounded_rectangle(
        [cx - crown_half_w, crown_top, cx + crown_half_w, crown_bottom],
        radius=crown_h * 0.5,
        fill=TOOTH,
    )

    # Small highlight for a bit of dimension.
    highlight_r = size * 0.035
    draw.ellipse(
        [
            cx - crown_half_w * 0.45 - highlight_r,
            crown_top + crown_h * 0.32 - highlight_r,
            cx - crown_half_w * 0.45 + highlight_r,
            crown_top + crown_h * 0.32 + highlight_r,
        ],
        fill=(255, 255, 255, 110),
    )

    return img


def flatten(img: Image.Image) -> Image.Image:
    """Composite onto opaque background — iOS/Android icon slots don't
    respect alpha consistently, so ship fully opaque PNGs."""
    bg = Image.new("RGB", img.size, BG[:3])
    bg.paste(img, mask=img.split()[3])
    return bg


master = draw_tooth(1024)

sizes = {
    "public/icons/icon-192.png": 192,
    "public/icons/icon-512.png": 512,
}
for path, size in sizes.items():
    flatten(master.resize((size, size), Image.LANCZOS)).save(path)
    print(f"wrote {path} ({size}x{size})")

# Next.js App Router file conventions: these are auto-detected and turned
# into the right <link> tags at build time, no metadata config needed.
flatten(master.resize((256, 256), Image.LANCZOS)).save("src/app/icon.png")
print("wrote src/app/icon.png (256x256)")

flatten(master.resize((180, 180), Image.LANCZOS)).save("src/app/apple-icon.png")
print("wrote src/app/apple-icon.png (180x180)")
