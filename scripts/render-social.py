"""Render the site's original typographic social card (requires Pillow)."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

root = Path(__file__).resolve().parent.parent
font_dir = Path('/System/Library/Fonts/Supplemental')
def font(name, size):
    paths = [font_dir / name, Path('/usr/share/fonts/truetype/dejavu') / ('DejaVuSerif.ttf' if 'Georgia' in name else 'DejaVuSans.ttf')]
    for path in paths:
        if path.exists(): return ImageFont.truetype(str(path), size)
    raise RuntimeError('Install a serif and a sans font or adjust font paths.')

im = Image.new('RGB', (1200, 630), '#f7f7f2')
d = ImageDraw.Draw(im)
ink, muted, green, rule = '#202d26', '#69756c', '#386548', '#dce1d6'
d.text((65, 52), 'RESEARCH / ENGINEERING / PRODUCTS', font=font('Arial.ttf', 16), fill=green)
d.text((60, 110), 'Yiju Zhao', font=font('Arial.ttf', 112), fill=ink)
d.ellipse((577, 197, 591, 211), fill=green)
d.text((65, 243), 'Eason Zhao  ·  Toronto, Canada', font=font('Arial.ttf', 20), fill=muted)
d.text((65, 312), 'Agents, research,', font=font('Georgia.ttf', 43), fill=ink)
d.text((65, 365), 'and useful software.', font=font('Georgia.ttf', 43), fill=ink)
for y, label, sub in [(150, 'RESEARCH', 'Post-training / RL'), (255, 'SYSTEMS', 'Agents / evaluation'), (360, 'PRODUCTS', 'Knowledge / workflows')]:
    d.rounded_rectangle((834, y, 1125, y + 80), radius=12, fill='#edeee7', outline='#bcc7b6', width=1)
    d.text((853, y + 16), label, font=font('Arial.ttf', 13), fill=green)
    d.text((853, y + 41), sub, font=font('Arial.ttf', 17), fill=ink)
    if y < 360:
        d.line((980, y + 80, 980, y + 105), fill='#bcc7b6', width=1)
d.line((65, 510, 1135, 510), fill=rule, width=1)
d.text((65, 545), 'Research Engineer  ·  PhD, Waterloo', font=font('Arial.ttf', 19), fill=muted)
d.text((895, 547), 'yiju-zhao.github.io', font=font('Arial.ttf', 18), fill=green)
im.save(root / 'assets/social.png', optimize=True)
