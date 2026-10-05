import assert from 'node:assert/strict';
import {SHOP_ITEMS,buyShopItem,shopBonuses,effectiveStaffQuality,scoutingReportCost,academyTrainingGain} from './src/game/shop.ts';
import {createFreeAgents,playerPurchasePrice} from './src/game/transfers.ts';
import {rewardTraining} from './src/game/training.ts';
import {simulateCalendarDay} from './src/game/calendar.ts';

const makeState=()=>({team:'sen',week:1,money:2000,players:createFreeAgents().slice(0,5),staff:[],mapMastery:{Ascent:48},trainingHistory:[],academyProspects:[],focus:'team'});
{
  const state=makeState();
  assert.equal(state.shopItems,undefined);
  assert.equal(shopBonuses(state).matchStrength,0);
  const balance=state.money;
  const purchase=buyShopItem(state,'pro-headsets');
  assert.equal(purchase.ok,true);
  assert.equal(state.money,balance-180);
  assert.deepEqual(state.shopItems,['pro-headsets']);
  assert.deepEqual(state.shopPurchases,[{itemId:'pro-headsets',week:1,price:180}]);
  assert.equal(shopBonuses(state).matchStrength,2);
  const snapshot=structuredClone(state);
  assert.equal(buyShopItem(state,'pro-headsets').ok,false);
  assert.equal(buyShopItem(state,'unknown').ok,false);
  assert.deepEqual(state,snapshot);
  state.money=0;
  const poor=structuredClone(state);
  assert.equal(buyShopItem(state,'academy-stations').ok,false);
  assert.deepEqual(state,poor);
  assert.equal(shopBonuses(JSON.parse(JSON.stringify(snapshot))).matchStrength,2);
  assert.equal(shopBonuses({shopItems:['pro-headsets','pro-headsets','unknown']}).matchStrength,2);
}
{
  const state=makeState();
  buyShopItem(state,'precision-mice');
  const player=state.players[0],agent=player.agent;
  const result={id:'one',kind:'aim',score:100,targets:[{playerId:player.id,agentId:agent}],map:'Ascent',completedAt:'2026-01-01'};
  rewardTraining(state,result);
  assert.equal(player.agentMastery[agent],57);
  rewardTraining(state,result);
  assert.equal(player.agentMastery[agent],57);
  rewardTraining(state,{...result,id:'zero',score:0});
  assert.equal(player.agentMastery[agent],57);
  player.agentMastery[agent]=98;
  rewardTraining(state,{...result,id:'cap'});
  assert.equal(player.agentMastery[agent],100);
}
{
  const state=makeState();
  buyShopItem(state,'tactical-monitors');buyShopItem(state,'ergonomic-chairs');buyShopItem(state,'recovery-kit');
  simulateCalendarDay(state,2,'Ascent');
  assert.equal(state.mapMastery.Ascent,50);
  state.players[0].energy=70;state.players[1].energy=99;
  simulateCalendarDay(state,5,'Ascent');
  assert.equal(state.players[0].energy,78);
  assert.equal(state.players[1].energy,100);
  state.players[0].morale=70;state.players[1].morale=99;
  simulateCalendarDay(state,6,'Ascent');
  assert.equal(state.players[0].morale,73);
  assert.equal(state.players[1].morale,100);
  state.mapMastery.Ascent=99;simulateCalendarDay(state,2,'Ascent');
  assert.equal(state.mapMastery.Ascent,100);
}
{
  const state=makeState(),scout={id:'scout',role:'scout',quality:80},coach={id:'coach',role:'coach',quality:84};
  buyShopItem(state,'coaching-tablets');buyShopItem(state,'scouting-laptop');
  state.staff=[scout,coach];
  assert.equal(effectiveStaffQuality(state,coach),89);
  assert.equal(effectiveStaffQuality(state,scout),85);
  assert.equal(scout.quality,80);assert.equal(coach.quality,84);
  assert.equal(effectiveStaffQuality(state,{role:'analyst',quality:98}),100);
  assert.equal(scoutingReportCost(state),30);
  const player=createFreeAgents()[0];
  assert.equal(playerPurchasePrice(state,player),Math.round(player.price*.915));
  state.staff=[];
  assert.equal(playerPurchasePrice(state,player),player.price);
  // Bought equipment benefits a later hire without mutating its base quality.
  state.staff=[{...scout,quality:90}];
  assert.equal(effectiveStaffQuality(state,state.staff[0]),95);
}
{
  const state=makeState();
  assert.equal(academyTrainingGain(state),2);
  buyShopItem(state,'academy-stations');
  assert.equal(academyTrainingGain(state),3);
  assert.equal(SHOP_ITEMS.length,8);
  assert.equal(new Set(SHOP_ITEMS.map(item=>item.image)).size,8);
}
console.log('Shop: purchases, saved inventory, duplicate guards, insufficient balance, training, recovery, staff/scout bonuses and academy OK');
