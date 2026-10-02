import json
import re
from collections import Counter
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import requests

TEAMS = {'loud':6961,'100t':120,'lev':2359,'nrg':1034,'prx':624,'tl':474,'kc':8877,'edg':1120}
MAPS = {'Ascent','Bind','Haven','Split','Lotus','Sunset','Abyss','Breeze','Fracture','Icebox','Pearl','Corrode','Summit'}

def read_team(item):
    key, team_id = item
    html = requests.get(f'https://www.vlr.gg/team/{team_id}', timeout=30).text
    recent = html.split('Recent Results', 1)[-1].split('Current\tRoster', 1)[0]
    names = re.findall(r'<div class="map">\s*([^<]+?)\s*</div>', recent)
    counts = Counter(name.strip() for name in names if name.strip() in MAPS)
    return key, {'sample':sum(counts.values()),'maps':dict(counts.most_common())}

with ThreadPoolExecutor(max_workers=4) as pool:
    result = dict(pool.map(read_team, TEAMS.items()))
Path('mapStats.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
print({key:(value['sample'],list(value['maps'].items())[:3]) for key,value in result.items()})
