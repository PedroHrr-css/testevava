# Tactical Valorant Manager

Jogo de gerenciamento de um time de VALORANT, feito com TypeScript, Vite e Three.js. A carreira funciona no navegador e salva o progresso no `localStorage`.

## Funcionalidades

- Escolha entre oito organizações e gerencie elencos com nomes e retratos reais.
- Escale cinco titulares, defina capitão, funções, números, uniformes e agentes.
- Selecione um ou vários atletas e jogue quatro minigames: mira por 30 segundos, ícones de habilidades → agentes, ícones → nomes de habilidades e identificação de recortes de mapas. A pontuação concede até +8 de domínio aos atletas selecionados, com limite de 100%; sessões abandonadas não concedem recompensa. Resultados ficam salvos na carreira.
- Monte táticas com pings nas plantas dos mapas e envie olheiros.
- Faça o veto BO3 antes de assistir ou simular: escolha a ordem A/B, bana e escolha mapas, selecione o lado inicial e confirme os três mapas. O adversário decide automaticamente; o terceiro mapa é jogado se necessário. O pool de sete mapas é definido para esta carreira fictícia.
- Assista às séries com agentes em movimento, disparos, eliminações, plant e desarme do spike, contagem regressiva, explosão, placar por round e controles de pausa e velocidade. Use “Assistir partida” na visão geral ou no campeonato; pular conclui a série e salva os resultados. Os agentes seguem caminhos navegáveis extraídos da planta, com distância de segurança das paredes.
- Simule séries do campeonato, faça contratações e acompanhe o ranking de abates, assistências e mortes.
- O campo é uma arena 3D estilizada em Three.js, com paredes extraídas da planta, figuras de jogadores, sombras, disparos e detonação. Alterne entre a câmera tática com órbita, terceira pessoa e visão do atleta. Arraste para ajustar o ângulo, use o zoom ou ‹ › para trocar entre atletas vivos. A visão do atleta inclui mira e minimapa. O som é opcional e começa desligado.

Os overalls, contratos, partidas e estatísticas da carreira são simulações. A frequência de mapas dos adversários é uma amostra de resultados recentes. Consulte [SOURCES.md](SOURCES.md) para as fontes de elencos e imagens.

## Executar

Requer Node.js 22.18 ou superior e npm.

```bash
npm install
npm run dev
```

Abra o endereço local mostrado pelo Vite. Para validar o projeto:

```bash
npm test
npm run build
```

O build verifica os tipos em modo estrito antes de gerar os arquivos. Para verificar apenas os tipos, use `npm run typecheck`. Para testar os controles e o salvamento no navegador:

```bash
npx playwright install chromium
npm run test:e2e
```

Se o Chrome já estiver instalado, use `PLAYWRIGHT_CHANNEL=chrome npm run test:e2e` para testá-lo sem baixar o Chromium. Os testes usam um servidor separado na porta 5174.

## Estrutura

- `manager.ts` e `manager.css`: interface e lógica da carreira.
- `map-veto.ts` e `src/ui/veto.css`: regras e interface do veto BO3, com picks por time, bans e mapa decisivo.
- `src/game/training.ts`: pontuação e recompensas dos treinos.
- `src/ui/training-hub.ts`, `training-session.ts` e `training.css`: seleção de atletas e minigames.
- `abilities.json` e `public/assets/abilities`: 116 nomes e ícones locais das habilidades; atualize com `npm run fetch-abilities`.
- `src/types`: contratos de tipos da carreira, jogadores, rounds, saves e navegação.
- `src/game/simulation.ts`: geração dos rounds e estatísticas, independente do navegador.
- `src/game/navigation.ts`: caminhos pelos corredores e linha de visão.
- `src/game/watch-series.ts`: relógio do replay, HUD, controles e conclusão da série.
- `src/game/match-renderer.ts`: arena Three.js, câmeras, minimapa e efeitos de combate.
- `src/game/arena-geometry.ts`: limites das paredes e colisão da câmera de terceira pessoa.
- `src/game/player-model.ts`: atletas estilizados com rostos, acessórios inspirados nos agentes, equipamento tático, rifle e quadris/joelhos articulados.
- `src/game/match-audio.ts`: efeitos sonoros opcionais.
- `src/ui/match-camera.css`: controles da câmera e HUD do espectador.
- `src/ui/navigation.ts` e `sidebar.css`: navegação com ícones SVG e barra fixa responsiva.
- `rosters.json`, `mapStats.json` e `agents.json`: dados usados pelo jogo.
- `public/assets`: escudos, retratos, agentes e mapas usados localmente.
- `fetch_*.py`: scripts para atualizar os dados e recursos públicos.

Após alterar as plantas dos mapas, regenere as rotas com `npm run build-map-navigation`.

A chave de salvamento `tactical-career-v3` foi mantida. O Three.js é carregado sob demanda ao assistir uma partida; abrir as telas de gestão não carrega o motor. Os efeitos e a câmera apresentam os eventos da simulação e não alteram seus resultados.

A arena 3D aproxima a planta 2D com paredes sem teto; não reproduz os modelos, alturas ou detalhes dos mapas originais de VALORANT. As rotas continuam usando a navegação existente. A câmera de terceira pessoa encurta a distância quando encontra uma parede, e a visão do atleta mantém o ponto de vista sobre a rota navegável. Requer WebGL 2; se o campo não carregar, “Pular e ver resultado” continua concluindo a série.

Nos treinos de mira e de habilidades, cada atleta evolui o agente atribuído no início da sessão. Nos treinos de mapas, evolui o mapa em foco; o domínio coletivo corresponde à média dos cinco titulares. Os mapas dos desafios variam entre os 13 disponíveis. As conexões de habilidades podem ser refeitas após erros, mas somente a primeira tentativa de cada par conta para a pontuação. Partidas não concedem mais o antigo ganho automático de domínio. Treinos de equipe, estratégia e recuperação ficam para uma próxima etapa.

O replay em 1× avança a 15% do ritmo original (metade da revisão anterior), com mais tempo entre eliminações e objetivos. Os controles 0,5×, 2× e 4× multiplicam esse novo ritmo. A passada acompanha a distância percorrida; mudar a velocidade não altera os resultados da simulação.

Os atletas têm proporções mais compactas, ombreiras menores, detalhes de rosto e cabelo, identificação nas costas e clarão do rifle ao disparar. A pausa preserva a pose da caminhada. O contador do spike mostra segundos no ritmo normal de 1×.
