#!/usr/bin/env python3
"""ZAIN.NET: narrowly fix overlapping floating Word text boxes in header copies.

Never mutate the uploaded DOCX. This script writes only an optional temporary
repaired DOCX. Uses Python stdlib to stay lightweight on Render Free.
"""
import json
import re
import sys
from pathlib import Path
from zipfile import ZipFile

ANCHOR = re.compile(r'<wp:anchor(?=[\s>])[\s\S]*?</wp:anchor>')
VERTICAL = re.compile(r'(<wp:positionV\b[^>]*>[\s\S]*?<wp:posOffset>)(-?\d+)(</wp:posOffset>)')
HORIZONTAL = re.compile(r'<wp:positionH\b[^>]*>[\s\S]*?<wp:posOffset>(-?\d+)</wp:posOffset>')
EXTENT = re.compile(r'<wp:extent\b[^>]*?\bcx="(\d+)"[^>]*?\bcy="(\d+)"')
EXTENT_REV = re.compile(r'<wp:extent\b[^>]*?\bcy="(\d+)"[^>]*?\bcx="(\d+)"')
HEADER_NAME = re.compile(r'^word/header\d+\.xml$')
MARGIN = re.compile(r'<w:pgMar\b[^>]*?\bw:header="(\d+)"')
TEXT = re.compile(r'<w:t(?:\s[^>]*)?>([^<]+)</w:t>')


def header_distance(main_xml: str) -> int:
    for match in MARGIN.finditer(main_xml):
        twips = int(match.group(1))
        if 500 <= twips <= 3300:
            return twips * 635
    return 1080000  # 1.18 inch: a conservative fallback


def overlaps(left, right):
    lx, ly, lw, lh = left['x'], left['y'], left['w'], left['h']
    rx, ry, rw, rh = right['x'], right['y'], right['w'], right['h']
    overlap_x = min(lx + lw, rx + rw) - max(lx, rx)
    overlap_y = min(ly + lh, ry + rh) - max(ly, ry)
    return (overlap_x > min(lw, rw) * 0.25 and
            overlap_y > min(lh, rh) * 0.45)


def repair_header(xml: str, baseline: int):
    candidates = []
    for match in ANCHOR.finditer(xml):
        value = match.group(0)
        if '<w:txbxContent' not in value:  # Leave logos, photos, decorations alone.
            continue
        y = VERTICAL.search(value)
        x = HORIZONTAL.search(value)
        e = EXTENT.search(value)
        if e:
            w, h = int(e.group(1)), int(e.group(2))
        else:
            e = EXTENT_REV.search(value)
            if not e:
                continue
            h, w = int(e.group(1)), int(e.group(2))
        visible_text = ''.join(TEXT.findall(value))
        if not x or not y or w < 10000 or h < 10000 or len(visible_text.strip()) < 10:
            continue
        candidates.append({
            'start': match.start(), 'end': match.end(), 'value': value,
            'x': int(x.group(1)), 'y': int(y.group(2)),
            'w': w, 'h': h,
        })

    final_y = {}
    changed = 0
    replacements = []
    for i, current in enumerate(candidates):
        prior_collisions = [j for j in range(i)
                            if overlaps(current, candidates[j])]
        # A textbox at the first PDF pixel is not a normal thesis heading.
        at_page_edge = current['y'] < baseline * 0.3
        if not at_page_edge and not prior_collisions:
            final_y[i] = current['y']
            continue
        chosen = max(current['y'], baseline)
        for j in prior_collisions:
            previous = candidates[j]
            chosen = max(chosen, final_y[j] + previous['h'] + 160000)
        final_y[i] = chosen
        if chosen == current['y']:
            continue
        fixed = VERTICAL.sub(
            lambda m: m.group(1) + str(chosen) + m.group(3),
            current['value'], count=1,
        )
        if fixed == current['value']:
            continue
        replacements.append((current['start'], current['end'], fixed))
        changed += 1

    for start, end, patch in reversed(replacements):
        xml = xml[:start] + patch + xml[end:]
    return xml, changed


def main(src: Path, dst: Path):
    if src.resolve() == dst.resolve():
        raise ValueError('Refusing to overwrite original DOCX')
    with ZipFile(src, 'r') as source:
        entries = source.infolist()
        if len(entries) > 6000 or sum(i.file_size for i in entries) > 200_000_000:
            raise ValueError('DOCX terlalu besar untuk diproses dengan aman')
        xml = source.read('word/document.xml').decode('utf-8')
        baseline = header_distance(xml)
        changes = 0
        repaired_parts = {}
        for entry in entries:
            if HEADER_NAME.match(entry.filename):
                data = source.read(entry.filename)
                if len(data) > 4_000_000:
                    continue
                patched, count = repair_header(data.decode('utf-8'), baseline)
                if count:
                    repaired_parts[entry.filename] = patched.encode('utf-8')
                    changes += count
        # Do not create another copy if no defect was identified.
        if changes:
            dst.parent.mkdir(parents=True, exist_ok=True)
            with ZipFile(dst, 'w') as target:
                for entry in entries:
                    target.writestr(entry, repaired_parts.get(entry.filename, source.read(entry.filename)))
    return {'repaired': changes, 'headers': sorted(repaired_parts)}


if __name__ == '__main__':
    if len(sys.argv) != 3:
        raise SystemExit('Usage: auto_repair.py source.docx repaired.docx')
    print(json.dumps(main(Path(sys.argv[1]), Path(sys.argv[2]))))
