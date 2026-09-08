#!/usr/bin/env python3
"""Render docs/UAT-ORBIT.md into a print-ready A4 PDF.

    pip install markdown playwright
    python3 scripts/build-uat-pdf.py

Chromium is located through PLAYWRIGHT_BROWSERS_PATH (or the CHROME_PATH
environment variable), so the document can be rebuilt whenever the markdown
source changes.
"""
import re, asyncio, pathlib, tempfile, os, shutil, glob
import markdown

SRC = pathlib.Path(__file__).resolve().parent.parent / 'docs' / 'UAT-ORBIT.md'
OUT = SRC.with_suffix('.pdf')
HTML_TMP = pathlib.Path(tempfile.gettempdir()) / 'uat-orbit.html'

text = SRC.read_text(encoding='utf-8')

# Body starts at section 1; everything above it becomes the cover page.
marker = '### 1. Informasi Dokumen'
body_md = text[text.index(marker):]

html_body = markdown.markdown(
    body_md,
    extensions=['tables', 'fenced_code', 'sane_lists', 'attr_list'],
    output_format='html5',
)

# Wide test-case matrices (8 columns) get their own compact class.
def tag_tables(html):
    out, pos = [], 0
    for m in re.finditer(r'<table>.*?</table>', html, re.S):
        block = m.group(0)
        head = block[:block.find('</thead>')] if '</thead>' in block else block
        cols = head.count('<th')
        if 'Tanda Tangan' in block:
            cls = 'sign'
        else:
            cls = 'matrix' if cols >= 8 else ('summary' if cols == 7 else 'plain')
        out.append(html[pos:m.start()])
        out.append(block.replace('<table>', f'<table class="{cls}">', 1))
        pos = m.end()
    out.append(html[pos:])
    return ''.join(out)

html_body = tag_tables(html_body)

for h in ('8. Rincian Hasil Pengujian', '12. Persetujuan', 'Lampiran A'):
    html_body = re.sub(r'<h3>(' + re.escape(h) + r'[^<]*)</h3>',
                       r'<h3 class="newpage">\1</h3>', html_body)

# Status cells become badges.
html_body = re.sub(r'>PASSED<', '><span class="badge pass">PASSED</span><', html_body)
html_body = re.sub(r'>FAILED<', '><span class="badge fail">FAILED</span><', html_body)

CSS = """
@page { size: A4; }
* { box-sizing: border-box; }
html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body {
  font-family: "Liberation Sans", "DejaVu Sans", Arial, sans-serif;
  font-size: 9.6pt; line-height: 1.5; color: #16202e; margin: 0;
}

/* ---------- cover ---------- */
.cover { height: 247mm; display: flex; flex-direction: column; break-after: page; }
.cover-mark { display: flex; align-items: center; gap: 9pt; }
.cover-dot { width: 26pt; height: 26pt; border-radius: 8pt; background: #0f2744;
  display: flex; align-items: center; justify-content: center; }
.cover-dot span { width: 12pt; height: 12pt; border-radius: 50%; border: 2.4pt solid #38bdf8; }
.cover-mark b { font-size: 15pt; letter-spacing: 0.06em; color: #0f2744; }
.cover-mark i { font-style: normal; font-size: 7.2pt; letter-spacing: 0.14em;
  text-transform: uppercase; color: #6b7a90; display: block; margin-top: 1pt; }
.cover-rule { height: 2.6pt; background: linear-gradient(90deg,#0f2744 0%,#38bdf8 100%);
  margin: 16pt 0 0; border-radius: 2pt; }
.cover-mid { margin-top: 34mm; }
.cover-eyebrow { font-size: 8.4pt; letter-spacing: 0.22em; text-transform: uppercase;
  color: #38bdf8; font-weight: 700; }
.cover h1 { font-size: 30pt; line-height: 1.15; margin: 8pt 0 0; color: #0f2744;
  letter-spacing: -0.4pt; }
.cover h2 { font-size: 13pt; font-weight: 500; color: #46566d; margin: 10pt 0 0; }
.cover .status { margin-top: 22pt; display: inline-block; border: 1.4pt solid #15803d;
  background: #edfdf3; color: #15803d; border-radius: 5pt; padding: 9pt 16pt;
  font-size: 12.5pt; font-weight: 700; letter-spacing: 0.02em; }
.cover .status small { display: block; font-size: 8.4pt; font-weight: 600;
  letter-spacing: 0.08em; text-transform: uppercase; color: #3f8f62; margin-top: 3pt; }
.cover-meta { margin-top: auto; border-top: 0.8pt solid #d4dbe4; padding-top: 12pt;
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 12pt; }
.cover-meta div span { display: block; font-size: 7.2pt; letter-spacing: 0.13em;
  text-transform: uppercase; color: #8593a6; margin-bottom: 3pt; }
.cover-meta div b { font-size: 9.6pt; color: #16202e; font-weight: 600; }

/* ---------- toc ---------- */
.toc { break-after: page; }
.toc ol { margin: 0; padding-left: 16pt; }
.toc li { margin: 3.5pt 0; font-size: 10pt; }
.toc .app { list-style: none; margin-left: -16pt; }

/* ---------- headings ---------- */
h3 { font-size: 13.5pt; color: #0f2744; margin: 20pt 0 8pt; padding-bottom: 4pt;
  border-bottom: 1.6pt solid #38bdf8; break-after: avoid; }
h4 { font-size: 11pt; color: #0f2744; margin: 15pt 0 6pt; break-after: avoid; }
h3 + h4 { margin-top: 10pt; }
p { margin: 6pt 0; }
ul, ol { margin: 6pt 0; padding-left: 17pt; }
li { margin: 2.5pt 0; }
hr { border: 0; border-top: 0.8pt solid #d4dbe4; margin: 16pt 0; }
strong { color: #0f2744; }

/* ---------- tables ---------- */
table { width: 100%; border-collapse: collapse; margin: 8pt 0 10pt; }
thead { display: table-header-group; }
tr { break-inside: avoid; }
th { background: #0f2744; color: #fff; font-size: 8.4pt; font-weight: 700;
  text-align: left; padding: 5pt 6pt; border: 0.5pt solid #0f2744; letter-spacing: 0.02em; }
td { padding: 4.6pt 6pt; border: 0.5pt solid #d4dbe4; vertical-align: top; }
tbody tr:nth-child(even) { background: #f5f8fb; }
table.plain td { font-size: 9.2pt; }
table.summary td { font-size: 9pt; }
table.summary tbody tr:last-child { background: #e8f1f9; font-weight: 700; }
table.matrix { font-size: 7.8pt; }
table.matrix th { font-size: 7.4pt; padding: 4pt 4pt; }
table.matrix td { padding: 3.6pt 4pt; line-height: 1.36; }
table.matrix th:nth-child(1), table.matrix td:nth-child(1) { width: 10.5%; font-weight: 600; }
table.matrix th:nth-child(2), table.matrix td:nth-child(2) { width: 15%; }
table.matrix th:nth-child(3), table.matrix td:nth-child(3) { width: 21%; }
table.matrix th:nth-child(4), table.matrix td:nth-child(4) { width: 21%; }
table.matrix th:nth-child(5), table.matrix td:nth-child(5) { width: 19%; }
table.matrix th:nth-child(6), table.matrix td:nth-child(6) { width: 4%; }
table.matrix th:nth-child(7), table.matrix td:nth-child(7) { width: 5%; }
table.matrix th:nth-child(8), table.matrix td:nth-child(8) { width: 4.5%; }

.badge { display: inline-block; padding: 1.4pt 4.5pt; border-radius: 3pt;
  font-size: 7pt; font-weight: 700; letter-spacing: 0.03em; }
.badge.pass { background: #dcfce7; color: #15803d; border: 0.4pt solid #86d3a6; }
.badge.fail { background: #fee2e2; color: #b91c1c; border: 0.4pt solid #f0a5a5; }

table.sign td { font-size: 9.4pt; padding: 7pt 8pt; }
table.sign tbody tr:last-child td { height: 66pt; vertical-align: bottom;
  padding-bottom: 9pt; color: #8593a6; }
table.sign tbody tr { background: #fff; }
h3.newpage { break-before: page; margin-top: 0; }

/* ---------- code / evidence blocks ---------- */
pre { background: #0f2744; color: #e6edf5; border-radius: 4pt; padding: 9pt 11pt;
  font-family: "DejaVu Sans Mono", "Liberation Mono", monospace; font-size: 7.8pt;
  line-height: 1.45; white-space: pre-wrap; break-inside: avoid; margin: 8pt 0; }
code { font-family: "DejaVu Sans Mono", "Liberation Mono", monospace; font-size: 8.6pt;
  background: #eef2f7; padding: 0.6pt 3pt; border-radius: 2.5pt; color: #0f2744; }
pre code { background: none; color: inherit; padding: 0; font-size: inherit; }
"""

COVER = """
<div class="cover">
  <div class="cover-mark">
    <div class="cover-dot"><span></span></div>
    <div><b>ORBIT</b><i>Overseas Risk Based Intelligence Tools</i></div>
  </div>
  <div class="cover-rule"></div>
  <div class="cover-mid">
    <div class="cover-eyebrow">Dokumen Pengujian Penerimaan Pengguna</div>
    <h1>User Acceptance<br>Test (UAT)</h1>
    <h2>ORBIT — Overseas Risk Based Intelligence Tools · Versi 1.0.0</h2>
    <div class="status">LULUS UJI 100% — DITERIMA
      <small>78 dari 78 test case PASSED · 0 defect terbuka</small>
    </div>
  </div>
  <div class="cover-meta">
    <div><span>Nomor Dokumen</span><b>ORBIT/UAT/2026/001</b></div>
    <div><span>Versi Dokumen</span><b>1.0</b></div>
    <div><span>Tanggal</span><b>8 September 2026</b></div>
    <div><span>Periode Pengujian</span><b>25 Agu – 5 Sep 2026</b></div>
    <div><span>Penguji 1</span><b>Tabah Darma</b></div>
    <div><span>Penguji 2</span><b>Andreas Immanuel Mulianto</b></div>
  </div>
</div>

<div class="toc">
  <h3>Daftar Isi</h3>
  <ol>
    <li>Informasi Dokumen</li>
    <li>Tujuan</li>
    <li>Ruang Lingkup</li>
    <li>Lingkungan Pengujian</li>
    <li>Peran dan Tanggung Jawab</li>
    <li>Kriteria Penerimaan</li>
    <li>Ringkasan Hasil Pengujian</li>
    <li>Rincian Hasil Pengujian (Modul A – N)</li>
    <li>Catatan Defect</li>
    <li>Catatan dan Saran Penguji</li>
    <li>Kesimpulan</li>
    <li>Persetujuan</li>
  </ol>
  <ol class="toc-app" style="list-style:none;padding-left:16pt">
    <li>Lampiran A — Bukti Teknis Pengujian</li>
  </ol>
</div>
"""

page = f"""<!doctype html><html lang="id"><head><meta charset="utf-8">
<title>UAT ORBIT</title><style>{CSS}</style></head><body>{COVER}{html_body}</body></html>"""
HTML_TMP.write_text(page, encoding='utf-8')

HEADER = """<div style="font-family:Arial,sans-serif;font-size:7pt;color:#8593a6;width:100%;
padding:0 14mm;display:flex;justify-content:space-between;border-bottom:0.4pt solid #dfe5ec;
padding-bottom:3pt;">
<span>ORBIT — User Acceptance Test</span><span>ORBIT/UAT/2026/001 · Versi 1.0</span></div>"""

FOOTER = """<div style="font-family:Arial,sans-serif;font-size:7pt;color:#8593a6;width:100%;
padding:0 14mm;display:flex;justify-content:space-between;border-top:0.4pt solid #dfe5ec;
padding-top:3pt;">
<span>Dokumen internal — hasil UAT 8 September 2026</span>
<span>Halaman <span class="pageNumber"></span> dari <span class="totalPages"></span></span></div>"""

def find_chrome():
    """The bundled Chromium, or whatever CHROME_PATH points at."""
    if os.environ.get('CHROME_PATH'):
        return os.environ['CHROME_PATH']
    root = os.environ.get('PLAYWRIGHT_BROWSERS_PATH', '/opt/pw-browsers')
    for pattern in (f'{root}/chromium-*/chrome-linux/chrome', f'{root}/chromium/chrome-linux/chrome'):
        found = sorted(glob.glob(pattern))
        if found:
            return found[-1]
    return shutil.which('chromium') or shutil.which('google-chrome')


async def main():
    from playwright.async_api import async_playwright
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            executable_path=find_chrome(),
            args=['--no-sandbox', '--font-render-hinting=none'])
        pg = await browser.new_page()
        await pg.goto(HTML_TMP.as_uri(), wait_until='networkidle')
        await pg.pdf(path=str(OUT), format='A4', print_background=True,
                     display_header_footer=True,
                     header_template=HEADER, footer_template=FOOTER,
                     margin={'top': '17mm', 'bottom': '15mm', 'left': '14mm', 'right': '14mm'})
        await browser.close()

asyncio.run(main())
print('written', OUT, OUT.stat().st_size, 'bytes')
