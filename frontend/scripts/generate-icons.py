"""Generate opaque home screen icons from the existing Brecos wordmark.

Run from frontend with: python3 scripts/generate-icons.py (requires Pillow).
"""
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parents[1]
logo = Image.open(root / 'src/assets/Brecos-logo-finale.png').convert('RGBA')
logo = logo.crop(logo.getbbox())
for size, name in [(180, 'apple-touch-icon.png'), (192, 'icon-192.png'), (512, 'icon-512.png')]:
    canvas = Image.new('RGB', (size, size), 'white')
    mark = logo.copy()
    mark.thumbnail((round(size * 0.84), round(size * 0.6)), Image.Resampling.LANCZOS)
    canvas.paste(mark, ((size - mark.width) // 2, (size - mark.height) // 2), mark)
    canvas.save(root / 'public' / name, optimize=True)
