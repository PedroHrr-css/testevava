import json
import re
from collections import Counter
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import requests

ROOT = Path(__file__).resolve().parent
TEAMS = {team['id']:team['vlrId'] for team in json.loads((ROOT / 'teams.json').read_text(encoding='utf-8'))}
MAPS = {'Ascent','Bind','Haven','Split','Lotus','Sunset','Abyss','Breeze','Fracture','Icebox','Pearl','Corrode','Summit'}

def read_team(item):
    key, team_id = item
    response = requests.get(f'https://www.vlr.gg/team/{team_id}', timeout=30)
    response.raise_for_status()
    html = response.text
    recent = html.split('Recent Results', 1)[-1].split('Current\tRoster', 1)[0]
    names = re.findall(r'<div class="map">\s*([^<]+?)\s*</div>', recent)
    counts = Counter(name.strip() for name in names if name.strip() in MAPS)
    return key, {'sample':sum(counts.values()),'maps':dict(counts.most_common())}

with ThreadPoolExecutor(max_workers=4) as pool:
    result = dict(pool.map(read_team, TEAMS.items()))
(ROOT / 'mapStats.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
print({key:(value['sample'],list(value['maps'].items())[:3]) for key,value in result.items()})
