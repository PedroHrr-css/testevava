# Tactical Valorant Manager

Jogo de gerenciamento de um time de VALORANT, feito com JavaScript e Vite. A carreira funciona no navegador e salva o progresso no `localStorage`.

## Funcionalidades

- Escolha entre oito organizações e gerencie elencos com nomes e retratos reais.
- Escale cinco titulares, defina capitão, funções, números, uniformes e agentes.
- Treine mapas e agentes, monte táticas com pings nas plantas dos mapas e envie olheiros.
- Simule séries do campeonato, faça contratações e acompanhe o ranking de abates, assistências e mortes.

Os overalls, contratos, partidas e estatísticas da carreira são simulações. A frequência de mapas dos adversários é uma amostra de resultados recentes. Consulte [SOURCES.md](SOURCES.md) para as fontes de elencos e imagens.

## Executar

Requer Node.js e npm.

```bash
npm install
npm run dev
```

Abra o endereço local mostrado pelo Vite. Para validar o projeto:

```bash
npm test
npm run build
```

## Estrutura

- `manager.js` e `manager.css`: interface e lógica da carreira.
- `rosters.json`, `mapStats.json` e `agents.json`: dados usados pelo jogo.
- `public/assets`: escudos, retratos, agentes e mapas usados localmente.
- `fetch_*.py`: scripts para atualizar os dados e recursos públicos.
