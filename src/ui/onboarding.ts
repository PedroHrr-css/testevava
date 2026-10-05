import type {Team} from '../types/career.ts';

const escapeHtml=(value:unknown)=>String(value??'').replace(/[&<>"']/g,character=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]!));

export const MANAGER_COUNTRIES=[
  {code:'BR',name:'Brasil'}, {code:'US',name:'Estados Unidos'},
  {code:'GB',name:'Reino Unido'}, {code:'KR',name:'Coreia do Sul'}, {code:'TR',name:'Turquia'},
];

interface ClubChoice {club:Team;badge:string}
interface TeamSelectionOptions {
  regions:string[];region:string;clubs:ClubChoice[];selected:Team;badge:string;
  overall:number;rosterCount:number;
  players:{alias:string;role:string;rating:number;portrait:string}[];
}
interface ManagerCreationOptions {
  club:Team;badge:string;name:string;country:string;portrait:string;avatar:string;
  avatars:{id:string;portrait:string}[];background:string;
  origins:{id:string;name:string;description:string;advantage:string;disadvantage:string;money:number}[];
  salary:string;budget:string;
}

function header(step:'team'|'manager'):string{
  return `<header class="onboard-header">
    <button type="button" class="onboard-brand" data-create-home aria-label="Voltar ao menu inicial">
      <span class="brand-symbol">V<span></span></span><span><strong>VAVA</strong><small>MANAGER</small></span>
    </button>
    <ol class="onboard-progress" aria-label="Etapas da nova carreira">
      <li class="${step==='team'?'active':'complete'}" ${step==='team'?'aria-current="step"':''}><span>${step==='team'?'01':'&#10003;'}</span>Equipe</li>
      <li class="${step==='manager'?'active':''}" ${step==='manager'?'aria-current="step"':''}><span>02</span>Manager</li>
    </ol>
    <span class="onboard-season">NOVA CARREIRA <b>2026</b></span>
  </header>`;
}

export function teamSelectionScreen(options:TeamSelectionOptions):string{
  const {selected,players}=options;
  const count=options.clubs.filter(item=>item.club.region===options.region).length;
  return `<main class="onboard-screen team-stage">
    ${header('team')}
    <div class="team-stage-grid">
      <section class="team-stage-select">
        <div class="onboard-title"><small class="eyebrow">01 / SUA PRÓXIMA CASA</small><h1>ESCOLHA SEU <em>TIME.</em></h1><p>Do primeiro treino ao palco mundial. Quem você vai levar ao topo?</p></div>
        <div class="region-picker" role="group" aria-label="Região do VCT">
          ${options.regions.map(region=>`<button type="button" data-create-region="${region}" aria-pressed="${region===options.region}" class="region-choice ${region===options.region?'active':''}"><span>VCT ${region}</span><small>${options.clubs.filter(item=>item.club.region===region).length} clubes</small></button>`).join('')}
        </div>
        <div class="club-grid-caption"><span>VCT ${options.region}</span><small>${count} organizações disponíveis</small></div>
        <div class="team-picker">
          ${options.clubs.filter(item=>item.club.region===options.region).map(({club,badge})=>`<button type="button" class="team-choice ${selected.id===club.id?'chosen':''}" data-create-team="${club.id}" style="--club:${club.color}" aria-pressed="${selected.id===club.id}"><i class="team-check" aria-hidden="true">&#10003;</i>${badge}<b>${escapeHtml(club.name)}</b><small>VCT ${club.region}</small><span class="team-choice-power">${club.power} <small>OVR</small></span></button>`).join('')}
        </div>
        <p class="onboard-hint">Selecione uma organização para conhecer o elenco e confirmar sua escolha.</p>
      </section>
      <aside class="team-stage-detail" style="--preview-club:${selected.color}">
        <section class="team-preview" aria-label="Prévia de ${escapeHtml(selected.name)}" aria-live="polite">
          <div class="club-preview-hero"><small class="eyebrow">SEU CLUBE SELECIONADO</small><div class="club-preview-brand">${options.badge}<div><h2>${escapeHtml(selected.name)}</h2><span>VCT ${selected.region}</span></div></div><p>Uma nova temporada. Um novo comando. A próxima história começa com você.</p></div>
          <dl class="team-preview-facts"><div><dt>FORÇA DO TIME</dt><dd>${options.overall}<small>/ 100</small></dd></div><div><dt>NO ELENCO</dt><dd>${options.rosterCount}<small>atletas</small></dd></div><div><dt>TEMPORADA</dt><dd>2026</dd></div></dl>
          <div class="team-preview-caption"><h3>Quinteto inicial</h3><span>${Math.max(0,options.rosterCount-5)} reservas</span></div>
          <div class="team-preview-players">${players.map(player=>`<div class="team-preview-player">${player.portrait}<b>${escapeHtml(player.alias)}</b><small>${escapeHtml(player.role)}</small><span class="preview-rating">${player.rating}</span></div>`).join('')}</div>
          <p class="preview-note">Atributos e funções são simulados para sua carreira.</p>
        </section>
        <div class="team-confirm"><span>PRÓXIMO PASSO <b>Crie a identidade do seu manager</b></span><button id="select-team" type="button" class="primary onboard-cta">ESCOLHER ${escapeHtml(selected.tag)} <span aria-hidden="true">→</span></button></div>
      </aside>
    </div>
  </main>`;
}

function originIcon(index:number):string{
  const paths=[
    '<path d="M8 4h8v6a4 4 0 0 1-8 0V4Zm4 10v5m-4 1h8M8 6H4v2a4 4 0 0 0 4 4m8-6h4v2a4 4 0 0 1-4 4"/>',
    '<rect x="3" y="4" width="18" height="13" rx="2"/><path d="m7 13 3-3 3 2 4-5M12 17v3m-4 0h8"/>',
    '<rect x="3" y="4" width="18" height="14" rx="3"/><path d="m10 8 5 3-5 3V8Zm-2 13h8"/>',
  ];
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[index]}</svg>`;
}

export function managerCreationScreen(options:ManagerCreationOptions):string{
  const country=MANAGER_COUNTRIES.find(item=>item.code===options.country)||MANAGER_COUNTRIES[0];
  const origin=options.origins.find(item=>item.id===options.background)!;
  return `<main class="onboard-screen manager-stage">
    ${header('manager')}
    <div class="manager-stage-grid">
      <div class="onboard-title manager-title"><button id="back-to-teams" type="button" class="onboard-back">← <span>Voltar à seleção de equipe</span></button><small class="eyebrow">02 / O ROSTO DA NOVA ERA</small><h1>CRIE SEU <em>MANAGER.</em></h1><p>Sua identidade. Sua trajetória. Seu jeito de comandar.</p></div>
      <form id="manager-create-form" class="manager-form">
        <section class="manager-section"><div class="manager-section-title"><span>01</span><h2>Identidade</h2></div>
          <div class="manager-fields"><div><label for="manager-name">NOME DO MANAGER</label><div class="name-entry"><input id="manager-name" maxlength="24" autocomplete="off" placeholder="Como você quer ser chamado?" value="${escapeHtml(options.name)}" aria-describedby="create-error"/><button id="random-name" type="button" aria-label="Sortear nome" title="Sortear nome"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="3"/><circle cx="8" cy="8" r="1"/><circle cx="16" cy="16" r="1"/><circle cx="12" cy="12" r="1"/></svg></button></div></div><div><label for="manager-country">NACIONALIDADE</label><select id="manager-country">${MANAGER_COUNTRIES.map(item=>`<option value="${item.code}" ${country.code===item.code?'selected':''}>${item.name}</option>`).join('')}</select></div></div>
          <div class="avatar-section-label"><label>SEU RETRATO</label><span>Selecione uma identidade</span></div>
          <div class="manager-avatars" role="group" aria-label="Escolha o retrato do manager">${options.avatars.map((avatar,index)=>`<button type="button" class="manager-avatar ${options.avatar===avatar.id?'chosen':''}" data-avatar="${avatar.id}" aria-label="Retrato ${index+1}" aria-pressed="${options.avatar===avatar.id}">${avatar.portrait}<span class="avatar-number">${String(index+1).padStart(2,'0')}</span><i aria-hidden="true">&#10003;</i></button>`).join('')}</div>
        </section>
        <section class="manager-section manager-origin-section"><div class="manager-section-title"><span>02</span><h2>Sua trajetória</h2><small>Uma vantagem. Um desafio.</small></div>
          <div class="background-options" role="group" aria-label="Background do manager">${options.origins.map((item,index)=>`<button type="button" class="background-choice ${item.id===origin.id?'chosen':''}" data-background="${item.id}" aria-pressed="${item.id===origin.id}"><span class="origin-card-top"><i>${originIcon(index)}</i><b class="background-choice-check" aria-hidden="true">&#10003;</b></span><strong>${escapeHtml(item.name)}</strong><span class="origin-description">${escapeHtml(item.description)}</span><span class="background-effects"><span class="origin-advantage"><small>PONTO FORTE</small><span>${escapeHtml(item.advantage)}</span></span><span class="origin-disadvantage"><small>DESAFIO</small><span>${escapeHtml(item.disadvantage)}</span></span></span></button>`).join('')}</div>
        </section>
      </form>
      <aside class="manager-aside"><div class="manager-preview-label"><span></span>PRÉVIA DA SUA CREDENCIAL</div>
        <section class="manager-id-card" aria-label="Card do manager"><div class="id-card-top"><b>VAVA</b><span>MANAGER / 2026</span></div><div class="id-card-art"><div id="manager-card-avatar">${options.portrait}</div><span class="portrait-caption">${escapeHtml(options.club.tag)} / TEAM PERSONNEL</span></div><div class="id-card-body"><span class="id-card-position">MANAGER PRINCIPAL</span><h2 id="manager-card-name">${escapeHtml(options.name||'Seu nome aqui')}</h2><div class="id-card-nationality" id="manager-card-country"><span>${country.code}</span>${country.name}</div><div class="id-card-origin">${escapeHtml(origin.name)}</div><div class="id-card-footer"><span>${options.badge}<b>${escapeHtml(options.club.name)}</b></span><span class="id-card-barcode" aria-hidden="true"></span></div></div></section>
        <div class="manager-offer-summary"><span>CONTRATO INICIAL <b>28 semanas</b></span><span>ORÇAMENTO DO CLUBE <b>${options.budget}</b></span></div>
      </aside>
      <div class="manager-submit"><p>Seu novo capítulo no <strong>${escapeHtml(options.club.name)}</strong> começa aqui.</p><div><p id="create-error" role="alert"></p><button id="start" type="submit" form="manager-create-form" class="primary onboard-cta">CONTINUAR PARA O CONTRATO <span aria-hidden="true">→</span></button></div></div>
    </div>
  </main>`;
}

export function managerContractDocument(options:{club:Team;name:string;origin:string;salary:string;budget:string;badge:string}):string{
  return `<div class="signing-heading"><div><small>ÚLTIMO PASSO / NOVA CARREIRA</small><h2 id="contract-title">Seu lugar no ${escapeHtml(options.club.name)}.</h2></div>${options.badge}</div>
    <article class="contract-paper"><header><span>VAVA MANAGER / TEMPORADA 2026</span><b>CONTRATO Nº 2026–001</b></header><h3>Contrato de gestão esportiva</h3><p class="contract-intro">A diretoria do <strong>${escapeHtml(options.club.name)}</strong> e <strong>${escapeHtml(options.name)}</strong> celebram o presente compromisso para a nova temporada.</p>
      <dl class="contract-terms"><div><dt>CARGO</dt><dd>Manager principal</dd></div><div><dt>VIGÊNCIA</dt><dd>28 semanas</dd></div><div><dt>REMUNERAÇÃO SEMANAL</dt><dd>${options.salary}</dd></div><div><dt>ORÇAMENTO INICIAL DO CLUBE</dt><dd>${options.budget}</dd></div></dl>
      <p><b>01 / Seu trabalho.</b> Liderar o elenco, planejar os treinos, desenvolver a Academy e representar o clube nas competições.</p><p><b>02 / Nossa confiança.</b> A diretoria apoiará sua trajetória de ${escapeHtml(options.origin).toLowerCase()}. Esperamos evolução do time e responsabilidade com o orçamento.</p><p class="contract-fiction">Documento fictício da carreira. Os valores e o vínculo se aplicam exclusivamente ao jogo.</p>
      <div class="contract-signatures"><div><span class="board-signature">Diretoria ${escapeHtml(options.club.tag)}</span><small>DIRETORIA DO CLUBE</small></div><div class="manager-signature"><span class="signature-name">${escapeHtml(options.name)}</span><svg class="signature-ink" viewBox="0 0 240 35" aria-hidden="true"><path d="M6 24 C25 7 29 39 50 16 S77 30 103 16 S125 28 145 12 S175 25 191 15 M22 30 Q110 17 232 25"/></svg><small>${escapeHtml(options.name)} / MANAGER</small></div></div>
    </article><div class="signing-status" role="status" aria-live="polite">Revise os termos e assine para começar sua carreira.</div><div class="signing-actions"><button type="button" data-contract-back>← Voltar ao manager</button><button type="button" class="primary" data-contract-sign>ASSINAR E COMEÇAR <span>→</span></button></div>`;
}
