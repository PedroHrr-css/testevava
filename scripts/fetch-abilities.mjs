import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const agents = JSON.parse(await fs.readFile(path.join(root, 'agents.json'), 'utf8'));
const catalog = new Map(agents.map(agent => [agent.id, agent]));
const response = await fetch('https://valorant-api.com/v1/agents?language=pt-BR&isPlayableCharacter=true', { signal: AbortSignal.timeout(30000) });
if (!response.ok) throw new Error(`Agents API: ${response.status}`);
const { data } = await response.json();
const abilities = [];
for (const entry of data) {
  const id = entry.displayName.toLowerCase().replaceAll('/', '-').replaceAll(' ', '-');
  if (!catalog.has(id)) continue;
  for (const ability of entry.abilities) {
    if (!ability.displayIcon || ability.slot === 'Passive') continue;
    abilities.push({ id: `${id}-${ability.slot.toLowerCase()}`, agentId: id, agentName: catalog.get(id).name, slot: ability.slot, name: ability.displayName, icon: `/assets/abilities/${id}-${ability.slot.toLowerCase()}.png`, sourceIcon: ability.displayIcon });
  }
}
await fs.mkdir(path.join(root, 'public/assets/abilities'), { recursive: true });
let cursor = 0;
await Promise.all(Array.from({ length: 6 }, async () => {
  while (cursor < abilities.length) {
    const ability = abilities[cursor++];
    const asset = await fetch(ability.sourceIcon, { signal: AbortSignal.timeout(30000) });
    if (!asset.ok) throw new Error(`Ability asset ${ability.id}: ${asset.status}`);
    await fs.writeFile(path.join(root, 'public', ability.icon), Buffer.from(await asset.arrayBuffer()));
  }
}));
const missing = agents.filter(agent => !abilities.some(ability => ability.agentId === agent.id));
if (missing.length) throw new Error(`Missing abilities: ${missing.map(agent => agent.name).join(', ')}`);
await fs.writeFile(path.join(root, 'abilities.json'), JSON.stringify(abilities.map(({sourceIcon, ...ability}) => ability), null, 2) + '\n');
console.log(`Saved ${abilities.length} ability names and icons for ${agents.length} agents in Portuguese.`);
