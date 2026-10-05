# Fontes dos elencos e imagens

## Criadores na aba Sponsors

O catálogo de marketing inclui [Coreano](https://valorantesports.com/en-GB/news/were-running-it-back-with-virtual-watch-parties-again-for-champions-seoul), [TcK](https://cloud9.gg/players/heitor-tomazela/), [Sacy](https://www.vlr.gg/player/659/gustavo-rossi), [tarik](https://linktr.ee/tarik), [TenZ](https://www.twitch.tv/tenz), [FNS](https://www.twitch.tv/gofns), [Kyedae](https://x.com/kyedae) e [Mixwell](https://www.twitch.tv/mixwell). São nomes de criadores conhecidos da comunidade de VALORANT, não uma afirmação de disponibilidade para patrocínio ou de endosso ao jogo. Preços e efeitos sobre a torcida são totalmente fictícios.

Os retratos dos criadores são as imagens públicas dos respectivos perfis na Twitch, consultadas via [IVR API](https://api.ivr.fi/docs) em 5 de outubro de 2026 e salvas em `public/assets/streamers`. O script `python scripts/fetch-streamer-avatars.py` atualiza as imagens e o manifesto local.

LogiLag, Razeira, HiperXis, N-ViDEIA, Red Buff e Corsairzinho são marcas de paródia criadas para o jogo. Seus contratos, pagamentos e acessórios virtuais são fictícios.

## Expansão regional — 5 de outubro de 2026

O catálogo `teams.json` reúne 27 clubes: nove na VCT Americas e seis em cada uma das regiões EMEA, Pacific e China. É uma seleção de clubes para o jogo, não a lista completa de participantes de cada liga. O calendário continua fictício, com 14 rodadas entre equipes da mesma região. Os atributos são simulados.

Os 19 elencos adicionados e seus escudos/retratos foram obtidos dos perfis públicos abaixo. Os oito elencos anteriores foram preservados. Todos os relatórios em `mapStats.json` foram atualizados a partir da amostra de resultados recentes desses perfis.

- Americas: [Sentinels](https://www.vlr.gg/team/2), [G2 Esports](https://www.vlr.gg/team/11058), [FURIA](https://www.vlr.gg/team/2406), [MIBR](https://www.vlr.gg/team/7386), [Cloud9](https://www.vlr.gg/team/188).
- EMEA: [FNATIC](https://www.vlr.gg/team/2593), [Team Vitality](https://www.vlr.gg/team/2059), [FUT Esports](https://www.vlr.gg/team/1184), [Natus Vincere](https://www.vlr.gg/team/4915).
- Pacific: [KIWOOM DRX](https://www.vlr.gg/team/8185), [Gen.G](https://www.vlr.gg/team/17), [T1](https://www.vlr.gg/team/14), [Global Esports](https://www.vlr.gg/team/918), [Nongshim RedForce](https://www.vlr.gg/team/11060).
- China: [Xi Lai Gaming](https://www.vlr.gg/team/13581), [Bilibili Gaming](https://www.vlr.gg/team/12010), [Trace Esports](https://www.vlr.gg/team/12685), [TYLOO](https://www.vlr.gg/team/731), [JD Gaming](https://www.vlr.gg/team/13576).

`python scripts/expand-rosters.py` importa apenas equipes ainda ausentes de `rosters.json`, verifica a identidade do clube e exige ao menos cinco jogadores. `python fetch_map_stats.py` atualiza os dados de mapas de todo o catálogo.

## Elencos originais

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

## Campeonatos da carreira

O calendário do jogo usa nomes de eventos reais: [VCT Kickoff, Masters Santiago, VCT Stage 1, Masters London, VCT Stage 2 e Champions Shanghai](https://valorantesports.com/en-GB/valorantesports), [Esports World Cup de VALORANT](https://ewc-web.prod.esf-systems.com/en/competitions/2026/valorant), [Tixinha & Sacy Invitational](https://www.vlr.gg/event/2549/tixinha-sacy-invitational-by-bonoxs) e [Red Bull Home Ground](https://www.redbull.com/int-en/events/red-bull-home-ground). O Invitational é inspirado na edição de 2025; sua presença na carreira de 2026 é fictícia. A ordem semanal condensada, os convites de pré-temporada, os critérios de classificação, confrontos, resultados, pontuações e prêmios são regras simuladas do jogo, não o calendário ou regulamento oficiais.

## Mapas e olheiros

Os nomes dos 13 mapas disponíveis no treino seguem a [lista oficial de mapas do VALORANT](https://playvalorant.com/en-us/maps/), consultada em 2 de outubro de 2026.

`mapStats.json` registra a frequência dos mapas exibidos na seção de resultados recentes dos perfis do VLR.gg acima, coletada na mesma data. A amostra varia por time e não equivale ao histórico completo nem à seleção oficial de mapas de um torneio. O envio de olheiros, o custo, a vantagem tática, o domínio de mapa e as séries do campeonato são simulações do jogo.

Os 29 agentes foram conferidos na [lista oficial de agentes](https://playvalorant.com/en-us/agents/). Os retratos dos agentes, as imagens panorâmicas dos mapas e suas plantas foram obtidos pelo [Valorant-API](https://valorant-api.com/), que disponibiliza os recursos visuais do jogo. Esses arquivos estão em `public/assets/agents` e `public/assets/maps`. Os pings táticos, o domínio de agente e as estatísticas K/A/D são dados locais e simulados da carreira.

## Treinos interativos

Os 116 ícones e nomes em português das habilidades dos 29 agentes foram obtidos em 3 de outubro de 2026 no endpoint de agentes do [Valorant-API](https://valorant-api.com/), com `language=pt-BR`. O catálogo está em `abilities.json`, os ícones em `public/assets/abilities` e a coleta pode ser repetida com `npm run fetch-abilities`. Os recortes do treino de mapas usam as imagens panorâmicas locais. Pontuações e recompensas são regras simuladas deste jogo, sem conexão com uma conta do VALORANT.
