"""Build small web derivatives from supplied UT art; originals stay intact."""
from pathlib import Path
from PIL import Image, ImageOps

root = Path(__file__).resolve().parents[1]
ut = root / 'src' / 'pages' / 'UltimateTeam'
flags = ut / 'Paises' / 'web'
flags.mkdir(exist_ok=True)
for source in sorted((ut / 'Paises').glob('*.jpg')):
    with Image.open(source) as image:
        image = ImageOps.exif_transpose(image).convert('RGB')
        image.thumbnail((480, 360), Image.Resampling.LANCZOS)
        image.save(flags / (source.stem + '.webp'), 'WEBP', quality=86, method=6)
with Image.open(ut / 'SobreUT.png') as image:
    image = ImageOps.exif_transpose(image).convert('RGBA')
    image.thumbnail((850, 1100), Image.Resampling.LANCZOS)
    image.save(ut / 'SobreUT.webp', 'WEBP', quality=88, method=6)
print(f'Built {len(list(flags.glob("*.webp")))} flags and SobreUT.webp; kept all originals.')
