import assert from 'node:assert/strict';
import {createFreeAgents,ensureTransferMarket,playerPurchasePrice,playerSaleValue,buyPlayer,sellPlayer,staffTransferValue,transferStaff} from './src/game/transfers.ts';
import {STAFF_CANDIDATES} from './src/game/staff.ts';
import {genericPortrait,academyPortraitIndex,assignAcademyPortraits} from './src/ui/portraits.ts';
import {createAcademyProspects,discoverAcademyProspect} from './src/game/academy.ts';

const makeState=()=>{
  const players=createFreeAgents().slice(0,5);
  const recruit=createFreeAgents()[5];
  return {team:'sen',week:1,money:1000,players,market:[recruit],staff:[],captain:players[0].id,trainingPlayer:players[0].id,trainingAthletes:[players[0].id,players[1].id],trainingUsage:{[players[0].id]:{week:1,count:1}},emails:[]};
};

// Upgrade saves once, including saves which already own a generated athlete.
{
  const state=makeState();
  assert.equal(ensureTransferMarket(state),true);
  assert.equal(new Set(state.market.map(player=>player.id)).size,state.market.length);
  assert.equal(state.market.some(player=>state.players.some(member=>member.id===player.id)),false);
  const count=state.market.length;
  assert.equal(ensureTransferMarket(state),false);
  assert.equal(state.market.length,count);
  buyPlayer(state,state.market[0].id);
  assert.equal(ensureTransferMarket(state),false);
  assert.equal(state.market.length,count-1);
}

// Buying spends exactly the quoted price, preserves the face, assigns an unused jersey,
// and cannot repeat or mutate the save after a failed payment.
{
  const state=makeState(),candidate=state.market[0];
  state.staff=[{id:'scout',role:'scout',quality:89}];
  const fee=playerPurchasePrice(state,candidate),balance=state.money;
  const result=buyPlayer(state,candidate.id);
  assert.equal(result.ok,true);
  assert.equal(state.money,balance-fee);
  assert.equal(state.players.at(-1).number,6);
  assert.equal(state.players.at(-1).portrait,candidate.portrait);
  assert.equal(state.market.length,0);
  assert.equal(buyPlayer(state,candidate.id).ok,false);
  const poor=makeState();poor.money=0;
  const snapshot=structuredClone(poor);
  assert.equal(buyPlayer(poor,poor.market[0].id).ok,false);
  assert.deepEqual(poor,snapshot);
}

// Five athletes is a hard minimum; selling a starter promotes the reserve and clears
// all stale references and competing offers, without allowing a second payout.
{
  const state=makeState(),id=state.players[0].id;
  const snapshot=structuredClone(state);
  assert.equal(sellPlayer(state,id).ok,false);
  assert.deepEqual(state,snapshot);
  buyPlayer(state,state.market[0].id);
  state.emails=[{id:'a',offer:{playerId:id,fee:250,status:'pending'}},{id:'b',offer:{playerId:id,fee:300,status:'pending'}}];
  const balance=state.money;
  assert.equal(sellPlayer(state,id,'a').ok,true);
  assert.equal(state.money,balance+250);
  assert.equal(state.players.length,5);
  assert.equal(state.players.some(player=>player.id===id),false);
  assert.equal(state.captain,state.players[0].id);
  assert.equal(state.trainingPlayer,state.players[0].id);
  assert.equal(state.trainingAthletes.includes(id),false);
  assert.equal(state.trainingUsage[id],undefined);
  assert.deepEqual(state.emails.map(email=>email.offer.status),['accepted','declined']);
  assert.equal(state.market.filter(player=>player.id===id).length,1);
  assert.equal(sellPlayer(state,id).ok,false);
  const saleValue=playerSaleValue(state.players[0]);
  assert.ok(saleValue<state.players[0].price);
}

// Invalid offers cannot remove an athlete or credit money.
{
  const state=makeState();buyPlayer(state,state.market[0].id);
  const before=structuredClone(state);
  assert.equal(sellPlayer(state,state.players[0].id,'missing').ok,false);
  assert.deepEqual(state,before);
}

// Staff compensation shrinks with remaining contract and is lower than hiring cost;
// repeated transfer clicks cannot pay twice.
for(const candidate of STAFF_CANDIDATES){
  const member={...candidate,id:`${candidate.id}-1`,candidateId:candidate.id,contractWeeks:12};
  assert.ok(staffTransferValue(member)<candidate.signingFee);
  assert.ok(staffTransferValue({...member,contractWeeks:3})<staffTransferValue(member));
  const state=makeState();state.staff=[member];
  const balance=state.money,fee=staffTransferValue(member);
  assert.equal(transferStaff(state,member.id).ok,true);
  assert.equal(state.staff.length,0);
  assert.equal(state.money,balance+fee);
  assert.equal(transferStaff(state,member.id).ok,false);
}

assert.equal(academyPortraitIndex('Kai Moreira'),academyPortraitIndex('Kai Moreira'));
assert.match(genericPortrait('Kai Moreira'),/generic-portrait/);
assert.match(genericPortrait('<script>',9),/&lt;script&gt;/);
const prospects=createAcademyProspects('sen',85);
assert.equal(new Set(prospects.map(person=>person.portrait)).size,6);
const promoted=prospects.shift();
const discovered=discoverAcademyProspect('sen',85,prospects,[promoted.id]);
assert.notEqual(discovered.id,promoted.id);
assert.equal(prospects.some(person=>person.id===discovered.id),false);
const oldProspects=prospects.map(({portrait,...person})=>person);
assert.equal(assignAcademyPortraits(oldProspects),true);
assert.equal(new Set(oldProspects.map(person=>person.portrait)).size,oldProspects.length);
assert.equal(assignAcademyPortraits(oldProspects),false);
console.log('Transfer market: migration, purchase, sales, captain/training cleanup, offers, staff compensation and portraits OK');
