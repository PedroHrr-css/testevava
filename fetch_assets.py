import json
import re
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import requests

ROOT = Path(__file__).parent
ASSETS = ROOT / 'public' / 'assets'
ASSETS.mkdir(exist_ok=True)
TEAMS = [(team['id'],team['vlrId']) for team in json.loads((ROOT / 'teams.json').read_text(encoding='utf-8'))]

def fetch_team(item):
    slug, tid = item
    html = requests.get(f'https://www.vlr.gg/team/{tid}', timeout=30).text
    logo = re.search(r'<img src="(//[^"]+)" alt="[^"]+ team logo"', html)
    section = html.split('Current\tRoster', 1)[-1].split('staff', 1)[0]
    blocks = section.split('<div class="team-roster-item">')[1:]
    roster = []
    for block in blocks:
        alias = re.search(r'team-roster-item-name-alias.*?</i>\s*([^<\s]+)', block, re.S)
        real = re.search(r'team-roster-item-name-real">\s*([^<]+)', block)
        photo = re.search(r'team-roster-item-img">\s*<img src="([^"]+)', block)
        if alias:
            roster.append({'alias': alias.group(1).strip(), 'real': real.group(1).strip() if real else '', 'image': photo.group(1) if photo else ''})
    return slug, {'logo': logo.group(1) if logo else '', 'players': roster}

with ThreadPoolExecutor(max_workers=4) as pool:
    data = dict(pool.map(fetch_team, TEAMS))

def download(item):
    filename, url = item
    if not url or '/img/base/ph/' in url:
        return
    try:
        response = requests.get('https:' + url if url.startswith('//') else url, timeout=30)
        response.raise_for_status()
        (ASSETS / filename).write_bytes(response.content)
    except requests.RequestException as error:
        print('Image failed:', filename, error)

images = []
for slug, info in data.items():
    images.append((f'{slug}.png', info['logo']))
    for player in info['players']:
        images.append((f'{slug}-{player["alias"].lower()}.png', player['image']))
with ThreadPoolExecutor(max_workers=8) as pool:
    list(pool.map(download, images))
(ROOT / 'rosters.json').write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps({key: len(value['players']) for key, value in data.items()}))
