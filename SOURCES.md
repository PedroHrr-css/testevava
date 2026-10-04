# Fontes dos elencos e imagens

Elencos, nomes, escudos e retratos foram consultados em 2 de outubro de 2026 nos perfis públicos do VLR.gg:

- [LOUD](https://www.vlr.gg/team/6961/loud)
- [100 Thieves](https://www.vlr.gg/team/120/100-thieves)
- [Leviatán](https://www.vlr.gg/team/2359/leviat-n)
- [NRG](https://www.vlr.gg/team/1034/nrg)
- [Paper Rex](https://www.vlr.gg/team/624/paper-rex)
- [Team Liquid](https://www.vlr.gg/team/474/team-liquid)
- [Karmine Corp](https://www.vlr.gg/team/8877/karmine-corp)
- [EDward Gaming](https://www.vlr.gg/team/1120/edward-gaming)

Os arquivos de imagem em `public/assets` são utilizados somente para esta interface. Alguns perfis não oferecem retrato; nesses casos o jogo mostra as iniciais do atleta. Overalls, funções, contratos, números, uniformes, calendário e transferências são simulações de gameplay.

O perfil do erde no VLR.gg não traz retrato. A foto dele usada no jogo vem da [matéria do THESPIKE.GG sobre sua contratação pela LOUD](https://www.thespike.gg/br/valorant/news/valorant-loud-oficializa-erde/7556).

## Mapas e olheiros

Os nomes dos 13 mapas disponíveis no treino seguem a [lista oficial de mapas do VALORANT](https://playvalorant.com/en-us/maps/), consultada em 2 de outubro de 2026.

`mapStats.json` registra a frequência dos mapas exibidos na seção de resultados recentes dos perfis do VLR.gg acima, coletada na mesma data. A amostra varia por time e não equivale ao histórico completo nem à seleção oficial de mapas de um torneio. O envio de olheiros, o custo, a vantagem tática, o domínio de mapa e as séries do campeonato são simulações do jogo.

Os 29 agentes foram conferidos na [lista oficial de agentes](https://playvalorant.com/en-us/agents/). Os retratos dos agentes, as imagens panorâmicas dos mapas e suas plantas foram obtidos pelo [Valorant-API](https://valorant-api.com/), que disponibiliza os recursos visuais do jogo. Esses arquivos estão em `public/assets/agents` e `public/assets/maps`. Os pings táticos, o domínio de agente e as estatísticas K/A/D são dados locais e simulados da carreira.

## Treinos interativos

Os 116 ícones e nomes em português das habilidades dos 29 agentes foram obtidos em 3 de outubro de 2026 no endpoint de agentes do [Valorant-API](https://valorant-api.com/), com `language=pt-BR`. O catálogo está em `abilities.json`, os ícones em `public/assets/abilities` e a coleta pode ser repetida com `npm run fetch-abilities`. Os recortes do treino de mapas usam as imagens panorâmicas locais. Pontuações e recompensas são regras simuladas deste jogo, sem conexão com uma conta do VALORANT.
