"""Import missing club rosters and their public VLR assets; preserve existing rosters."""
import html
import json
import re
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import requests

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / 'public' / 'assets'

def fetch_roster(team):
    url = f'https://www.vlr.gg/team/{team["vlrId"]}'
    response = requests.get(url, timeout=30)
    response.raise_for_status()
    page = response.text
    title = re.search(r'<title>(.*?)</title>', page, re.S).group(1).strip()
    if team['name'].lower() not in html.unescape(title).lower():
        raise ValueError(f'Unexpected team: {team["id"]}: {title}')
    logo = re.search(r'<img src="(//[^"]+)" alt="[^"]+ team logo"', page)
    section = re.split(r'Current\s+Roster', page, maxsplit=1)[1].split('staff', 1)[0]
    players = []
    for block in section.split('<div class="team-roster-item">')[1:]:
        alias = re.search(r'team-roster-item-name-alias.*?</i>\s*([^<\s]+)', block, re.S)
        real = re.search(r'team-roster-item-name-real">\s*([^<]+)', block)
        photo = re.search(r'team-roster-item-img">\s*<img src="([^"]+)', block)
        if alias:
            players.append({'alias':html.unescape(alias.group(1).strip()), 'real':html.unescape(real.group(1).strip()) if real else '', 'image':photo.group(1) if photo else ''})
    if len(players) < 5:
        raise ValueError(f'{team["id"]}: only {len(players)} players')
    print(f'{team["id"]}: {len(players)} players', flush=True)
    return team['id'], {'logo':logo.group(1) if logo else '', 'players':players}

def download(item):
    name, url = item
    if not url or '/img/base/ph/' in url:
        return
    url = 'https:'+url if url.startswith('//') else url
    response = requests.get(url, timeout=30)
    response.raise_for_status()
    (ASSETS / name).write_bytes(response.content)

if __name__ == '__main__':
    data = json.loads((ROOT / 'rosters.json').read_text(encoding='utf-8'))
    teams = json.loads((ROOT / 'teams.json').read_text(encoding='utf-8'))
    missing = [team for team in teams if team['id'] not in data]
    with ThreadPoolExecutor(max_workers=4) as pool:
        additions = dict(pool.map(fetch_roster, missing))
    jobs = []
    for slug, roster in additions.items():
        jobs.append((f'{slug}.png',roster['logo']))
        jobs.extend((f'{slug}-{p["alias"].lower()}.png',p['image']) for p in roster['players'])
    with ThreadPoolExecutor(max_workers=6) as pool:
        list(pool.map(download,jobs))
    data.update(additions)
    (ROOT / 'rosters.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
    print(f'Saved {len(data)} rosters and {len(jobs)} new asset entries.')
