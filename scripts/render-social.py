"""Render the site's original typographic social card (requires Pillow)."""
from pathlib import Path
import re
from PIL import Image, ImageDraw, ImageFont

root = Path(__file__).resolve().parent.parent
font_dir = Path('/System/Library/Fonts/Supplemental')
def font(name, size):
    paths = [font_dir / name, Path('/usr/share/fonts/truetype/dejavu') / ('DejaVuSerif.ttf' if 'Georgia' in name else 'DejaVuSans.ttf')]
    for path in paths:
        if path.exists(): return ImageFont.truetype(str(path), size)
    raise RuntimeError('Install a serif and a sans font or adjust font paths.')

# Read the light-theme tokens so sharing artwork follows the website palette.
css = (root / 'tokens.css').read_text().split(':root[data-theme=')[0]
palette = dict(re.findall(r'(--[\w-]+):\s*(#[0-9a-fA-F]+)', css))
im = Image.new('RGB', (1200, 630), palette['--color-paper'])
d = ImageDraw.Draw(im)
ink, muted, accent, rule = [palette[k] for k in ['--color-ink', '--color-muted', '--color-accent', '--color-rule']]
d.text((65, 52), 'RESEARCH / ENGINEERING / PRODUCTS', font=font('Arial.ttf', 16), fill=accent)
d.text((60, 110), 'Yiju Zhao', font=font('Arial.ttf', 112), fill=ink)
d.ellipse((577, 197, 591, 211), fill=palette['--color-brand'])
d.text((65, 243), 'Eason Zhao  ·  Toronto, Canada', font=font('Arial.ttf', 20), fill=muted)
d.text((65, 312), 'Agents, research,', font=font('Georgia.ttf', 43), fill=ink)
d.text((65, 365), 'and useful software.', font=font('Georgia.ttf', 43), fill=ink)
for y, label, sub in [(150, 'RESEARCH', 'Post-training / RL'), (255, 'SYSTEMS', 'Agents / evaluation'), (360, 'PRODUCTS', 'Knowledge / workflows')]:
    d.rounded_rectangle((834, y, 1125, y + 80), radius=12, fill=palette['--color-paper-2'], outline=palette['--color-rule-2'], width=1)
    d.text((853, y + 16), label, font=font('Arial.ttf', 13), fill=accent)
    d.text((853, y + 41), sub, font=font('Arial.ttf', 17), fill=ink)
    if y < 360:
        d.line((980, y + 80, 980, y + 105), fill=palette['--color-rule-2'], width=1)
d.line((65, 510, 1135, 510), fill=rule, width=1)
d.text((65, 545), 'Research Engineer  ·  PhD, Waterloo', font=font('Arial.ttf', 19), fill=muted)
d.text((895, 547), 'yiju-zhao.github.io', font=font('Arial.ttf', 18), fill=accent)
im.save(root / 'assets/social.png', optimize=True)
