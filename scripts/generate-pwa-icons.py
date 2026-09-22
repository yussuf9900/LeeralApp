#!/usr/bin/env python3
"""
Générateur d'icônes PWA et d'assets graphiques pour Leeral
Génère l'ensemble des résolutions PNG à partir du logo SVG officiel.
"""

import os
import subprocess
from PIL import Image

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
PUBLIC_DIR = os.path.join(BASE_DIR, 'frontend', 'public')
ICONS_DIR = os.path.join(PUBLIC_DIR, 'icons')
SVG_PATH = os.path.join(PUBLIC_DIR, 'favicon.svg')

os.makedirs(ICONS_DIR, exist_ok=True)

with open(SVG_PATH, 'r', encoding='utf-8') as f:
    svg_content = f.read()

# 1. HTML template pour le rendu standard (1024x1024 pour un rendu ultra haute définition)
html_standard = f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * {{ box-sizing: border-box; margin: 0; padding: 0; }}
  body {{
    width: 1024px;
    height: 1024px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: radial-gradient(circle at 50% 35%, #1e1b4b 0%, #0f172a 100%);
    border-radius: 220px;
    overflow: hidden;
  }}
  .icon-box {{
    width: 720px;
    height: 720px;
    display: flex;
    align-items: center;
    justify-content: center;
    filter: drop-shadow(0 20px 40px rgba(126, 20, 255, 0.45)) drop-shadow(0 0 80px rgba(245, 158, 11, 0.35));
  }}
  svg {{
    width: 100%;
    height: 100%;
  }}
</style>
</head>
<body>
  <div class="icon-box">
    {svg_content}
  </div>
</body>
</html>
"""

# 2. HTML template pour Maskable Icon (zone de sûreté avec marge supplémentaire 20%)
html_maskable = f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * {{ box-sizing: border-box; margin: 0; padding: 0; }}
  body {{
    width: 1024px;
    height: 1024px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #0f172a;
  }}
  .icon-box {{
    width: 580px;
    height: 580px;
    display: flex;
    align-items: center;
    justify-content: center;
    filter: drop-shadow(0 15px 30px rgba(126, 20, 255, 0.4));
  }}
  svg {{
    width: 100%;
    height: 100%;
  }}
</style>
</head>
<body>
  <div class="icon-box">
    {svg_content}
  </div>
</body>
</html>
"""

# 3. HTML template pour OpenGraph (1200x630)
html_og = f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * {{ box-sizing: border-box; margin: 0; padding: 0; }}
  body {{
    width: 1200px;
    height: 630px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 70px 90px;
    background: radial-gradient(circle at 20% 30%, #1e1b4b 0%, #090d16 100%);
    color: #ffffff;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }}
  .text-side {{
    max-width: 650px;
  }}
  .badge {{
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: rgba(245, 158, 11, 0.15);
    border: 1px solid rgba(245, 158, 11, 0.4);
    color: #f59e0b;
    padding: 8px 16px;
    border-radius: 30px;
    font-size: 15px;
    font-weight: 700;
    margin-bottom: 24px;
  }}
  h1 {{
    font-size: 54px;
    font-weight: 900;
    line-height: 1.15;
    letter-spacing: -0.03em;
    margin-bottom: 18px;
    background: linear-gradient(135deg, #ffffff 0%, #fde68a 60%, #f59e0b 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }}
  p {{
    font-size: 22px;
    color: #94a3b8;
    line-height: 1.5;
  }}
  .logo-side {{
    width: 340px;
    height: 340px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(30, 27, 75, 0.5);
    border: 2px solid rgba(245, 158, 11, 0.25);
    border-radius: 60px;
    box-shadow: 0 25px 60px rgba(0,0,0,0.5), 0 0 80px rgba(126, 20, 255, 0.35);
  }}
  .logo-side svg {{
    width: 220px;
    height: 220px;
  }}
</style>
</head>
<body>
  <div class="text-side">
    <div class="badge">🇸🇳 Conforme CRSE & SONES Sénégal</div>
    <h1>LEERAL</h1>
    <p>Simulateur officiel et gestionnaire intelligent de factures Senelec (Woyofal) et Sen'Eau au Sénégal.</p>
  </div>
  <div class="logo-side">
    {svg_content}
  </div>
</body>
</html>
"""

temp_html_std = '/tmp/leeral_icon_std.html'
temp_html_mask = '/tmp/leeral_icon_mask.html'
temp_html_og = '/tmp/leeral_og.html'

with open(temp_html_std, 'w', encoding='utf-8') as f:
    f.write(html_standard)
with open(temp_html_mask, 'w', encoding='utf-8') as f:
    f.write(html_maskable)
with open(temp_html_og, 'w', encoding='utf-8') as f:
    f.write(html_og)

temp_png_std = '/tmp/leeral_icon_1024.png'
temp_png_mask = '/tmp/leeral_mask_1024.png'
og_png_path = os.path.join(PUBLIC_DIR, 'og-image.png')

print("Rendu Chrome headless de l'icône standard 1024x1024...")
subprocess.run([
    'google-chrome', '--headless', '--disable-gpu',
    f'--screenshot={temp_png_std}',
    '--window-size=1024,1024',
    f'file://{temp_html_std}'
], check=True)

print("Rendu Chrome headless de l'icône maskable 1024x1024...")
subprocess.run([
    'google-chrome', '--headless', '--disable-gpu',
    f'--screenshot={temp_png_mask}',
    '--window-size=1024,1024',
    f'file://{temp_html_mask}'
], check=True)

print("Rendu Chrome headless de l'image OpenGraph 1200x630...")
subprocess.run([
    'google-chrome', '--headless', '--disable-gpu',
    f'--screenshot={og_png_path}',
    '--window-size=1200,630',
    f'file://{temp_html_og}'
], check=True)

print("Génération des différentes déclinaisons de tailles avec Pillow...")
base_img = Image.open(temp_png_std)
mask_img = Image.open(temp_png_mask)

# 512x512 standard
base_img.resize((512, 512), Image.Resampling.LANCZOS).save(os.path.join(ICONS_DIR, 'icon-512x512.png'), 'PNG')

# 192x192 standard
base_img.resize((192, 192), Image.Resampling.LANCZOS).save(os.path.join(ICONS_DIR, 'icon-192x192.png'), 'PNG')

# 512x512 maskable
mask_img.resize((512, 512), Image.Resampling.LANCZOS).save(os.path.join(ICONS_DIR, 'icon-maskable-512x512.png'), 'PNG')

# 180x180 Apple touch icon
base_img.resize((180, 180), Image.Resampling.LANCZOS).save(os.path.join(ICONS_DIR, 'apple-touch-icon.png'), 'PNG')
base_img.resize((180, 180), Image.Resampling.LANCZOS).save(os.path.join(PUBLIC_DIR, 'apple-touch-icon.png'), 'PNG')

# 32x32 & 16x16 Favicons
favicon_32 = base_img.resize((32, 32), Image.Resampling.LANCZOS)
favicon_32.save(os.path.join(ICONS_DIR, 'favicon-32x32.png'), 'PNG')

favicon_16 = base_img.resize((16, 16), Image.Resampling.LANCZOS)
favicon_16.save(os.path.join(ICONS_DIR, 'favicon-16x16.png'), 'PNG')

# Favicon .ico multi-résolution
base_img.save(
    os.path.join(PUBLIC_DIR, 'favicon.ico'),
    format='ICO',
    sizes=[(16, 16), (32, 32), (48, 48), (64, 64)]
)

print("🎉 Toutes les icônes PWA et assets graphiques ont été générés avec succès !")
