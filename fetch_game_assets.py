import json
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import requests
from PIL import Image
from io import BytesIO

ROOT=Path(__file__).parent
ASSETS=ROOT/'public'/'assets'
MAP_IDS=['Summit','Corrode','Abyss','Sunset','Lotus','Pearl','Fracture','Breeze','Icebox','Ascent','Split','Haven','Bind']
ROLE={'Duelist':'Duelista','Initiator':'Iniciador','Controller':'Controlador','Sentinel':'Sentinela'}

agents=requests.get('https://valorant-api.com/v1/agents?isPlayableCharacter=true',timeout=30).json()['data']
maps=requests.get('https://valorant-api.com/v1/maps',timeout=30).json()['data']
selected_maps={m['displayName']:m for m in maps if m['displayName'] in MAP_IDS}

def download(item):
    path,url=item
    if not url:
        return str(path)
    response=requests.get(url,timeout=45)
    response.raise_for_status()
    path.parent.mkdir(parents=True,exist_ok=True)
    if path.name.endswith('-splash.jpg'):
        image=Image.open(BytesIO(response.content)).convert('RGB')
        image.thumbnail((960,540))
        image.save(path,format='JPEG',quality=84,optimize=True)
    elif path.parent.name=='agents':
        image=Image.open(BytesIO(response.content)).convert('RGBA')
        image.thumbnail((256,256))
        image.save(path,format='PNG',optimize=True)
    else:
        path.write_bytes(response.content)
    return None

jobs=[]
catalog=[]
for agent in agents:
    slug=agent['displayName'].lower().replace('/','-').replace(' ','-')
    catalog.append({'id':slug,'name':agent['displayName'],'role':ROLE.get((agent.get('role') or {}).get('displayName'),'Flex')})
    jobs.append((ASSETS/'agents'/f'{slug}.png',agent['displayIcon']))
for name in MAP_IDS:
    entry=selected_maps[name]
    slug=name.lower()
    jobs.append((ASSETS/'maps'/f'{slug}-splash.jpg',entry['splash']))
    jobs.append((ASSETS/'maps'/f'{slug}-plan.png',entry['displayIcon']))
with ThreadPoolExecutor(max_workers=8) as pool:
    missing=[result for result in pool.map(download,jobs) if result]
(ROOT/'agents.json').write_text(json.dumps(sorted(catalog,key=lambda x:x['name']),ensure_ascii=False,indent=2),encoding='utf-8')
print('agents',len(catalog),'maps',len(selected_maps),'missing',missing)
