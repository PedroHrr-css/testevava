# Plano da demo — VAVA Manager

Primeira entrega: mini temporada livre de quatro semanas e quatro séries BO3, com todos os menus disponíveis. O jogador escolhe a organização, cria o manager, administra o clube e conclui a campanha. Ganhar não é requisito para avançar.

## O que o jogador deve entender

O ciclo é **preparar → decidir → disputar → analisar → melhorar**. A home mostra a semana atual, a próxima decisão recomendada, quantas partidas faltam e por que cada sistema importa. As tarefas são sugestões; o calendário e os jogos determinam a progressão.

| Semana | Foco | Decisões sugeridas | Marco obrigatório |
| --- | --- | --- | --- |
| 1 | Preparar o elenco | Escolher titulares e capitão, atribuir agentes, concluir um treino e ativar uma tática | Concluir a primeira série |
| 2 | Conhecer o adversário | Usar olheiros, consultar mapas e ajustar o veto e a preparação | Concluir a segunda série |
| 3 | Melhorar o time | Ler os resultados e escolher entre contratar jogador, contratar staff ou investir nos treinos | Concluir a terceira série |
| 4 | Fechar a campanha | Revisar energia, moral, funções e tática; disputar a rodada final | Concluir a quarta série e consultar o balanço |

Os dois convites iniciais já estão aceitos na demo. Isso garante quatro partidas sem obrigar o jogador a aprender as regras de inscrição antes de testar o ciclo principal. Permanecem os jogos e adversários do calendário existente; a quarta rodada é o encerramento da demo, sem inventar um torneio eliminatório.

## Progresso e consequências

- Partidas: avançam a campanha, registram estatísticas, afetam caixa, torcida, energia e moral.
- Treinos: aumentam domínio de mapa ou agente; seleção e pontuação importam.
- Táticas: o plano ativo e os pings guiam a preparação e a movimentação assistida.
- Mercado e staff: oferecem decisões de investimento com custo imediato e despesas recorrentes.
- Academia, patrocínios e loja: ficam acessíveis para exploração, sem serem requisitos da campanha.
- Derrota: mantém o resultado e suas consequências, mas permite seguir a próxima semana.

Não há bloqueio artificial de menus, obrigação de comprar itens ou exigência de vencer. Os objetivos sugeridos não dão dinheiro repetidamente nem podem ser usados para farmar recompensas.

## Encerramento

Depois da quarta partida, o calendário não avança e nenhuma quinta partida pode começar. O jogador pode continuar consultando os menus. A home mostra vitórias e derrotas, overall atual, orçamento, treinos concluídos e táticas criadas.

Há um campo de comentário e exportação local de feedback em JSON. O arquivo contém o comentário e um resumo da sessão; não inclui nome do manager e não é enviado automaticamente. O jogador pode compartilhar o arquivo voluntariamente com a equipe.

## Save e distribuição

- Demo: `?demo=1`, save `tactical-demo-v1`.
- Carreira normal: save `tactical-career-v3`, preservado ao entrar na demo.
- O menu inicial permite entrar na demo, retomá-la ou voltar à carreira completa.
- Reset na demo apaga somente seu próprio save.
- Build estático em `dist`; requer servir os arquivos por HTTP. Não abrir `index.html` diretamente pelo disco.
- Publicação pública é uma etapa separada; esta entrega prepara e valida a versão local.

Não há duração prometida: quatro BO3 assistidos podem ser longos no ritmo atual. Pausa, aceleração, simulação e pular para resultado permitem uma sessão mais curta. O tempo real deve ser medido nos primeiros testes antes de comunicar uma estimativa aos jogadores.

## Critérios para abrir o teste

1. Criar e retomar demo sem alterar uma carreira normal já salva.
2. Completar as quatro semanas e impedir a quinta partida.
3. Navegar em todos os menus, fazer veto e iniciar uma partida assistida.
4. Mostrar no carregamento o primeiro mapa da série e trocar o ambiente entre mapas.
5. Salvar resultados uma única vez, inclusive ao pular a transmissão.
6. Mostrar o balanço, salvar o comentário e baixar o feedback.
7. Usar a home em celular sem rolagem horizontal.

## Progressão da carreira completa

O guia também organiza a carreira existente: preparação nas semanas 1–2, classificação no Kickoff nas semanas 3–4, Stage 1 e etapas internacionais nas semanas 5–10, Stage 2 e busca do Champions nas semanas 11–14. As condições reais de classificação continuam nas regras de torneios.

## Depois da demo

Prioridade 1: coletar feedback sobre clareza, ritmo, veto e utilidade dos treinos. Prioridade 2: balancear custos e ganhos com sessões completas. Prioridade 3: tornar as decisões durante a partida parte da simulação, permitindo trocar táticas e reagir ao adversário. Hoje o resultado é calculado antes do replay; trocar um plano visual não deve ser apresentado como mudança real de resultado.

Antes de lançar como produto final: completar a validação da carreira longa e resolver os testes antigos de gerenciamento que ainda referenciam interfaces removidas.
