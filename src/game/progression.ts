import type {CareerState,View} from '../types/career.ts';

export const DEMO_WEEKS=4;
export const demoFinished=(state:CareerState)=>!!state.demo&&((state.tournamentResults?.length??0)>=DEMO_WEEKS||state.week>DEMO_WEEKS);
export interface CareerGoal {title:string;why:string;view:View;done:boolean}
export function careerProgression(state:CareerState){
  const played=state.tournamentResults?.length??0;
  const stages=[
    {title:'Prepare seu elenco',description:'Defina os titulares, treine um atleta e salve uma tática antes do primeiro confronto.'},
    {title:'Conheça o adversário',description:'Use os olheiros para escolher mapas e prepare o plano do próximo confronto.'},
    {title:'Melhore o time',description:'Use os resultados para decidir entre reforçar o elenco, contratar staff ou investir nos treinos.'},
    {title:'Feche sua campanha',description:'Prepare o elenco para a última rodada e compare sua evolução desde a estreia.'},
  ];
  const fullStages=[
    stages[0],
    {title:'Conquiste sua vaga',description:'As semanas 3 e 4 valem a classificação ao primeiro Masters: vença ao menos uma série no Kickoff.'},
    {title:'Dispute o circuito',description:'No Stage 1, duas vitórias abrem a classificação para as etapas internacionais.'},
    {title:'Busque o Mundial',description:'Conquiste duas vitórias no Stage 2 e cinco vitórias regionais na temporada para chegar ao Champions.'},
  ];
  const current=state.demo?stages[Math.min(3,Math.max(0,state.week-1))]:fullStages[state.week<=2?0:state.week<=4?1:state.week<=10?2:3];
  const training=(state.trainingHistory??[]).some(session=>session.targets.some(target=>state.players.slice(0,5).some(player=>player.id===target.playerId)));
  const tactics=state.tactics.some(tactic=>state.activeTactics[tactic.map]===tactic.id);
  const goals:CareerGoal[]=[
    {title:'Definir o quinteto',why:'Titulares, funções, capitão e agentes formam a base do seu plano.',view:'squad',done:state.demo?!!state.demo.lineupConfirmed:state.players.length>=5&&!!state.captain},
    {title:'Concluir um treino',why:'Treinos aumentam o domínio de mapa ou agente dos atletas selecionados.',view:'training',done:training},
    {title:'Ativar uma tática',why:'O plano ativo influencia a preparação e as rotas na partida assistida.',view:'strategy',done:tactics},
    {title:'Estudar um adversário',why:'O relatório mostra os mapas para preparar seu veto.',view:'scouting',done:Object.keys(state.scoutReports).length>0},
  ];
  const investment:CareerGoal={title:'Escolher seu investimento',why:'Compare o custo de reforçar o elenco, contratar staff ou treinar os titulares.',view:'market',done:(state.staff?.length??0)>0||state.players.some(player=>player.source!==state.team)};
  const weeklyGoals=state.demo?(state.week===1?[goals[0],goals[1],goals[2]]:state.week===2?[goals[3],goals[2],goals[1]]:state.week===3?[investment,goals[1],goals[2]]:[goals[2],goals[1]]):goals;
  const recommended=weeklyGoals.find(goal=>!goal.done)??{title:'Preparar o próximo confronto',why:'Revise o elenco e avance a agenda até o dia da partida.',view:'competition' as View,done:false};
  return {stages,current,goals,recommended,played,finished:demoFinished(state),total:state.demo?4:14};
}
