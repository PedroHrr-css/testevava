import type {CareerState,StaffContract} from '../types/career.ts';
import {STAFF_CANDIDATES,STAFF_EFFECTS,STAFF_ROLE_LABELS,staffEffectLabel} from '../game/staff.ts';
import {staffTransferValue} from '../game/transfers.ts';
import {genericPortrait} from './portraits.ts';
import {effectiveStaffQuality} from '../game/shop.ts';

interface StaffViewOptions {embedded?:boolean;role?:'staff'|StaffContract['role']}

export function staffView(state:CareerState,cash:(value:number)=>string,escape:(value:unknown)=>string,options:StaffViewOptions={}):string {
  const allStaff=state.staff||[];
  const matches=(role:StaffContract['role'])=>!options.role||options.role==='staff'&&role!=='scout'||role===options.role;
  const staff=allStaff.filter(member=>matches(member.role));
  const weekly=staff.reduce((sum,item)=>sum+item.weeklySalary,0);
  const contracts=staff.map(member=>{
    const portrait=Math.max(0,STAFF_CANDIDATES.findIndex(person=>person.id===member.candidateId));
    const transfer=staffTransferValue(member);
    const quality=effectiveStaffQuality(state,member);
    return `<article class="staff-member" data-staff-member="${member.id}"><div class="staff-avatar">${genericPortrait(member.name,portrait)}</div><div class="staff-member-info"><div class="staff-member-title"><div><small>${STAFF_ROLE_LABELS[member.role].toUpperCase()}</small><h2>${escape(member.name)}</h2></div><b>${quality}<small>OVR</small></b></div><p>${STAFF_EFFECTS[member.role]} Efeito atual: <strong>${staffEffectLabel(member.role,quality)}</strong></p>${quality>member.quality?`<p class="shop-equipment-note">+${quality-member.quality} de qualidade com equipamentos do clube.</p>`:''}<div class="staff-contract-line"><span>CONTRATO <b>${member.contractWeeks} semanas</b></span><span>FOLHA <b>${cash(member.weeklySalary)} / sem.</b></span></div><div class="staff-actions"><button data-action="develop-staff" data-id="${member.id}" ${state.money<90||member.quality>=100||member.lastDevelopmentWeek!==undefined&&state.week-member.lastDevelopmentWeek<3?'disabled':''}>DESENVOLVER · ${cash(90)}</button>${member.contractWeeks<=3?`<button data-action="renew-staff" data-id="${member.id}" ${state.money<member.weeklySalary*2?'disabled':''}>RENOVAR · ${cash(member.weeklySalary*2)}</button>`:''}<button class="staff-transfer" data-action="transfer-staff" data-id="${member.id}" ${transfer<=0?'disabled':''}>TRANSFERIR · ${cash(transfer)}</button><button class="staff-dismiss" data-action="fire-staff" data-id="${member.id}">DEMITIR</button></div></div></article>`;
  }).join('');
  const candidates=STAFF_CANDIDATES.filter(person=>matches(person.role)).map(person=>{
    const employed=allStaff.some(member=>member.role===person.role);
    const blocked=employed||state.money<person.signingFee;
    const portrait=STAFF_CANDIDATES.findIndex(candidate=>candidate.id===person.id);
    const quality=effectiveStaffQuality(state,person);
    return `<article class="staff-candidate" data-staff-candidate="${person.id}"><div class="staff-candidate-top"><span class="staff-avatar">${genericPortrait(person.name,portrait)}</span><span><small>${STAFF_ROLE_LABELS[person.role].toUpperCase()}</small><h3>${escape(person.name)}</h3></span><strong>${quality}<small>OVR</small></strong></div><p>${escape(person.bio)}</p><div class="staff-effect">${STAFF_EFFECTS[person.role]} Efeito: ${staffEffectLabel(person.role,quality)}.</div><div class="staff-candidate-contract"><span>ASSINATURA <b>${cash(person.signingFee)}</b></span><span>POR SEMANA <b>${cash(person.weeklySalary)}</b></span></div><button data-action="hire-staff" data-id="${person.id}" ${blocked?'disabled':''}>${employed?'VAGA OCUPADA':state.money<person.signingFee?'SALDO INSUFICIENTE':'CONTRATAR ↗'}</button></article>`;
  }).join('');
  const header=options.embedded?'':`<div class="page-title"><div><small class="eyebrow">GESTÃO DO CLUBE</small><h1>COMISSÃO <em>TÉCNICA.</em></h1><p>Contrate profissionais para melhorar o time e gerencie salários, desenvolvimento e contratos.</p></div><div class="overall-box"><small>STAFF CONTRATADO</small><b>${allStaff.length}<span> / 4</span></b><small>FOLHA ${cash(weekly)} / SEM.</small></div></div>`;
  return `${header}<div class="${options.embedded?'market-embedded-staff':''}">${staff.length?`<section class="staff-section"><div class="panel-head"><div><small class="eyebrow">EQUIPE ATUAL</small><h2>${options.role==='scout'?'Seu olheiro':'Profissionais contratados'}</h2></div><span class="tag">${staff.length} ATIVOS</span></div><div class="staff-current-grid">${contracts}</div></section>`:`<section class="staff-empty"><span>♙</span><div><b>${options.role==='scout'?'Você ainda não contratou um olheiro.':'Nenhum profissional contratado nesta categoria.'}</b><small>Escolha profissionais abaixo para dar suporte ao elenco.</small></div></section>`}<section class="staff-section staff-market"><div class="panel-head"><div><small class="eyebrow">MERCADO DE PROFISSIONAIS</small><h2>Disponíveis para contratar</h2></div><span class="tag">${cash(state.money)} DISPONÍVEIS</span></div><div class="staff-candidate-grid">${candidates}</div><div class="data-note">Uma vaga por função. Contratos de 12 semanas, com salários descontados no avanço semanal. A transferência gera uma compensação proporcional ao tempo de contrato; a demissão encerra o vínculo sem receita.</div></section></div>`;
}
