"""Save public Twitch profile pictures used by the in-game creator catalog."""
import json
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import requests

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / 'public' / 'assets' / 'streamers'
MANIFEST = ROOT / 'src' / 'data' / 'streamer-avatars.json'
CHANNELS = {
    'coreano':'coreano', 'tck':'tck10', 'sacy':'sacy', 'tarik':'tarik',
    'tenz':'tenz', 'fns':'gofns', 'kyedae':'kyedae', 'mixwell':'mixwell',
}

def download(item):
    creator_id, channel = item
    result = requests.get(f'https://api.ivr.fi/v2/twitch/user?login={channel}',timeout=20)
    result.raise_for_status()
    users = result.json()
    if len(users)!=1 or users[0].get('login','').lower()!=channel:
        raise ValueError(f'Unexpected Twitch profile for {creator_id}')
    url = users[0]['logo']
    image = requests.get(url,timeout=25)
    image.raise_for_status()
    data = image.content
    if data.startswith(b'\x89PNG\r\n\x1a\n'): extension='png'
    elif data.startswith(b'\xff\xd8\xff'): extension='jpg'
    elif data.startswith(b'RIFF') and data[8:12]==b'WEBP': extension='webp'
    else: raise ValueError(f'Unknown image format for {creator_id}')
    filename=f'{creator_id}.{extension}'
    (DEST / filename).write_bytes(data)
    print(f'{creator_id}: {len(data)} bytes',flush=True)
    return creator_id, f'/assets/streamers/{filename}'

if __name__=='__main__':
    DEST.mkdir(parents=True,exist_ok=True)
    MANIFEST.parent.mkdir(parents=True,exist_ok=True)
    with ThreadPoolExecutor(max_workers=4) as pool:
        avatars=dict(pool.map(download,CHANNELS.items()))
    MANIFEST.write_text(json.dumps(avatars,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
    print(f'Saved {len(avatars)} creator images.')
