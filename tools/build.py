"""Build the free static edition from its original, public content. No dependencies."""
import html
import json
import re
import zipfile
from pathlib import Path

PUBLIC = Path(__file__).resolve().parents[1]
EXPORT_FILES = (
    '.nojekyll', 'index.html', 'style.css', 'app.js', 'core.js',
    'content/guides.json', 'content/guides.js', 'guide.md', 'offline.html',
    'README.md', 'PRIVACY.md', 'NOTICE.md',
    'skills/modern-thinking-public/SKILL.md', 'tools/build.py',
)


def validate(data):
    for field in ('version', 'notice'):
        if not isinstance(data.get(field), str) or not data[field].strip():
            raise ValueError('Missing ' + field)
    if not isinstance(data.get('cards'), list) or not data['cards']:
        raise ValueError('Missing cards')
    ids = set()
    for card in data['cards']:
        for field in ('id', 'title', 'category', 'summary', 'when', 'watch', 'limit', 'origin'):
            if not isinstance(card.get(field), str) or not card[field].strip():
                raise ValueError('Invalid card field ' + field)
        if card['id'] in ids or not re.fullmatch(r'[a-z0-9-]+', card['id']):
            raise ValueError('Invalid or duplicate card id')
        ids.add(card['id'])
        if not isinstance(card.get('steps'), list) or not card['steps']:
            raise ValueError('Missing steps')
        if any(not isinstance(s, str) or not s.strip() for s in card['steps']):
            raise ValueError('Invalid step')
    return data


def script_json(data):
    return json.dumps(data, ensure_ascii=False, indent=2).replace('&', '\\u0026').replace('<', '\\u003c').replace('>', '\\u003e')


def build():
    data = validate(json.loads((PUBLIC / 'content/guides.json').read_text(encoding='utf-8')))
    (PUBLIC / 'content/guides.js').write_text('window.PUBLIC_GUIDES = ' + script_json(data) + ';\n', encoding='utf-8')
    lines = ['# 现代思维人生指南 · 免费公开指南', '', '版本：' + data['version'], '', data['notice'], '',
             '以下为本项目原创通用建议。可以只阅读，也可以选择一条用于整理自己的问题。', '']
    for card in data['cards']:
        lines += ['## ' + card['title'], '', card['summary'], '', '适用场景：' + card['when'], '']
        lines += [f'{i}. {step}' for i, step in enumerate(card['steps'], 1)]
        lines += ['', '回看：' + card['watch'], '', '边界：' + card['limit'], '', '来源：' + card['origin'], '']
    (PUBLIC / 'guide.md').write_text('\n'.join(lines), encoding='utf-8')

    page = (PUBLIC / 'index.html').read_text(encoding='utf-8')
    page = re.sub(r'\s*<meta[^>]*http-equiv="Content-Security-Policy"[^>]*>', '', page)
    css = (PUBLIC / 'style.css').read_text(encoding='utf-8')
    page = page.replace('<link rel="stylesheet" href="./style.css">', '<style>\n' + css + '\n</style>')
    for source in ('content/guides.js', 'core.js', 'app.js'):
        page = re.sub(r'<script\s+defer\s+src="\./' + re.escape(source) + r'"></script>', '', page)
    page = page.replace('<body>', '<body id="top">')
    links = {'./guide.md': '#guides', './offline.html': '#top',
             './PRIVACY.md': '#offline-privacy', './NOTICE.md': '#offline-notice',
             './download/modern-thinking-guide.zip': 'https://fancy0121.github.io/modern-thinking-guide/download/modern-thinking-guide.zip'}
    for old, new in links.items():
        page = page.replace('href="' + old + '"', 'href="' + new + '"')
    legal = '\n<section class="offline-legal"><h2 id="offline-privacy">隐私说明</h2><pre>' + html.escape((PUBLIC / 'PRIVACY.md').read_text(encoding='utf-8')) + '</pre>'
    legal += '<h2 id="offline-notice">免费使用与权利说明</h2><pre>' + html.escape((PUBLIC / 'NOTICE.md').read_text(encoding='utf-8')) + '</pre></section>\n'
    scripts = '\n'.join((PUBLIC / source).read_text(encoding='utf-8').replace('</script', '<\\/script') for source in ('content/guides.js', 'core.js', 'app.js'))
    page = page.replace('</body>', legal + '<script>\n' + scripts + '\n</script>\n</body>')
    page = re.sub(r'(?m)^[ \t]+$', '', page)
    (PUBLIC / 'offline.html').write_text(page, encoding='utf-8')

    destination = PUBLIC / 'download/modern-thinking-guide.zip'
    destination.parent.mkdir(exist_ok=True)
    with zipfile.ZipFile(destination, 'w', compression=zipfile.ZIP_DEFLATED) as package:
        for name in EXPORT_FILES:
            info = zipfile.ZipInfo('modern-thinking-guide/' + name, date_time=(2026, 10, 13, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o100644 << 16
            package.writestr(info, (PUBLIC / name).read_bytes())
    print(f'Built {len(data["cards"])} guides; {len(EXPORT_FILES)} allowlisted files in offline package.')


if __name__ == '__main__':
    build()
