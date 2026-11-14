"""Add separate Custom Scan mode without touching fixed university cover templates."""
from pathlib import Path

def edit(path, anchor, new):
    p = Path(path)
    s = p.read_text(encoding='utf-8')
    if new in s:
        print(path, 'already integrated')
        return
    n = s.count(anchor)
    if n != 1:
        raise RuntimeError(f'{path}: required anchor count={n}, expected 1')
    p.write_text(s.replace(anchor, anchor + new), encoding='utf-8')
    print(path, 'updated')

base=Path('public/hardcover-link2')
if not base.joinpath('index.html').exists(): raise RuntimeError('Missing source Cover V4.46')
# Linked separate mode rather than adding a new style to fixed-layout code.
marker='  </div>\n  <label class="custom-color-row hidden"'
anchor='   <button class="cover-style" type="button" data-cover-style="customlogo2"'
html=base.joinpath('index.html').read_text(encoding='utf-8')
if 'href="./custom-scan.html"' not in html:
    if html.count(marker)!=1 or html.count(anchor)!=1:
        raise RuntimeError('Could not locate style card insertion point')
    link='    <a class="cover-style" href="./custom-scan.html" style="text-decoration:none;color:inherit;display:flex;flex-direction:column;justify-content:center"><span class="swatch" style="background:linear-gradient(90deg,#f8fafc 50%,#1458a8 50%)"></span><strong>Custom Scan — Ikuti Layout Asli</strong><small>Kampus lain • Rekonstruksi semua baris & posisi dari scan, editor bebas</small></a>\n'
    html=html.replace(marker,link+marker)
    base.joinpath('index.html').write_text(html,encoding='utf-8')
    print('custom scan entry added')
else: print('custom scan entry already exists')
edit('server.ts',
 "import { hardcoverCoverOcrRouter } from './server/hardcoverCoverOcr/router.ts';",
 "\nimport { hardcoverCustomLayoutRouter } from './server/hardcoverCoverOcr/customLayout.ts';")
edit('server.ts',
 "app.use('/api/hardcover-cover-ocr', hardcoverCoverOcrRouter);",
 "\napp.use('/api/hardcover-custom-layout', hardcoverCustomLayoutRouter);")

assert Path('public/hardcover-link2/custom-scan.html').exists()
assert Path('public/hardcover-link2/custom-scan.js').exists()
assert Path('server/hardcoverCoverOcr/customLayout.ts').exists()
