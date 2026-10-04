import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const ASSETS = path.join(ROOT, 'public', 'assets');
const MAP_IDS = [
  'Summit', 'Corrode', 'Abyss', 'Sunset', 'Lotus', 'Pearl', 'Fracture', 'Breeze',
  'Icebox', 'Ascent', 'Split', 'Haven', 'Bind',
];

function absUrl(url) {
  if (!url || url.includes('/img/base/ph/')) return null;
  if (url.startsWith('//')) return `https:${url}`;
  if (url.startsWith('http')) return url;
  if (url.startsWith('/')) return `https://www.vlr.gg${url}`;
  return url;
}

async function downloadFile(dest, url) {
  const resolved = absUrl(url);
  if (!resolved) return false;
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const res = await fetch(resolved);
  if (!res.ok) throw new Error(`${res.status} ${resolved}`);
  fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
  return true;
}

async function fetchRosterAssets() {
  const rosters = JSON.parse(fs.readFileSync(path.join(ROOT, 'rosters.json'), 'utf8'));
  const jobs = [];
  for (const [slug, info] of Object.entries(rosters)) {
    jobs.push([path.join(ASSETS, `${slug}.png`), info.logo]);
    for (const player of info.players) {
      jobs.push([path.join(ASSETS, `${slug}-${player.alias.toLowerCase()}.png`), player.image]);
    }
  }
  let ok = 0;
  for (const [dest, url] of jobs) {
    try {
      if (await downloadFile(dest, url)) ok++;
    } catch (err) {
      console.warn('skip', path.basename(dest), err.message);
    }
  }
  return ok;
}

async function fetchGameAssets() {
  const [agentsRes, mapsRes] = await Promise.all([
    fetch('https://valorant-api.com/v1/agents?isPlayableCharacter=true'),
    fetch('https://valorant-api.com/v1/maps'),
  ]);
  const agents = (await agentsRes.json()).data;
  const maps = (await mapsRes.json()).data;
  const byName = Object.fromEntries(maps.map((m) => [m.displayName, m]));
  let ok = 0;
  for (const agent of agents) {
    const slug = agent.displayName.toLowerCase().replace(/\//g, '-').replace(/ /g, '-');
    const dest = path.join(ASSETS, 'agents', `${slug}.png`);
    try {
      if (await downloadFile(dest, agent.displayIcon)) ok++;
    } catch (err) {
      console.warn('skip agent', slug, err.message);
    }
  }
  for (const name of MAP_IDS) {
    const entry = byName[name];
    if (!entry) {
      console.warn('missing map in API:', name);
      continue;
    }
    const slug = name.toLowerCase();
    for (const [suffix, url] of [
      ['-plan.png', entry.displayIcon],
      ['-splash.jpg', entry.splash],
    ]) {
      const dest = path.join(ASSETS, 'maps', `${slug}${suffix}`);
      try {
        if (await downloadFile(dest, url)) ok++;
      } catch (err) {
        console.warn('skip map', slug + suffix, err.message);
      }
    }
  }
  return ok;
}

const rosterOk = await fetchRosterAssets();
const gameOk = await fetchGameAssets();
console.log(`Downloaded ${rosterOk} roster assets, ${gameOk} game assets into public/assets/`);
