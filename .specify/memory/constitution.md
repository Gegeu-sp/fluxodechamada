# Presença+ Constitution

## Core Principles

### I. Single-File, Zero-Build
O produto é entregue como um único arquivo estático (`index.html`) contendo HTML, CSS e JS. Não há etapa de build, bundler, transpilador ou gerenciador de pacotes local. Qualquer nova funcionalidade DEVE continuar funcionando ao simplesmente abrir/servir esse arquivo, sem passos de instalação. Dependências externas são permitidas apenas via CDN (ex.: Chart.js, Fontsource) e devem degradar de forma visível e não quebrar o restante da página quando indisponíveis (ex.: mensagem de erro no lugar do gráfico, como já ocorre com `chartsGrid`).

### II. Client-Side Only, Dados Simulados
Não existe backend, API ou banco de dados real. Todos os dados de aulas e alunos são gerados no cliente por um PRNG determinístico (`mulberry32`/`hashStr`), semeado pela data e pelo ID do aluno, garantindo que a mesma data sempre produza a mesma "realidade simulada". A única persistência real é `localStorage` (`presenca_plus_v1`), guardando apenas os *overrides* de presença marcados pelo usuário — nunca os dados gerados. Este é um protótipo de demonstração declarado explicitamente no rodapé da página; mudanças não devem introduzir a expectativa de dados reais/produção sem atualizar essa premissa explicitamente.

### III. Português do Brasil, Interface Única
Toda a interface, textos, rótulos e mensagens são em pt-BR. Não há internacionalização. Nomenclatura de variáveis/IDs no código pode ser em inglês, mas todo texto visível ao usuário permanece em português.

### IV. Responsivo por Contrato (Breakpoints Fixos)
O layout DEVE continuar funcional nos três regimes já definidos em CSS: desktop (>920px), tablet (521–920px) e mobile (≤520px). Alterações de layout devem ser verificadas nos três regimes antes de serem consideradas concluídas — não apenas no viewport desktop.

### V. Verificação Real, Não Apenas Leitura de Código
Como não há suite de testes automatizada, toda alteração de comportamento visível ao usuário DEVE ser verificada executando o app de fato num navegador (Playwright/Chromium ou equivalente), cobrindo o fluxo afetado em pelo menos um viewport desktop e um mobile, antes de ser considerada concluída. Alegar que "deveria funcionar" com base apenas na leitura do código não é verificação suficiente.

## Restrições Técnicas

- Sem frameworks (React/Vue/Angular etc.) e sem gerenciador de pacotes (`package.json`) a menos que uma decisão explícita e documentada mude esse princípio.
- Dependências externas apenas via CDN com fallback visível de erro.
- Nenhuma credencial, chave de API ou dado real de aluno deve ser commitado — os dados de alunos são fictícios e gerados por seed.

## Fluxo de Desenvolvimento (Spec-Driven)

- Novas funcionalidades seguem o fluxo do Spec Kit: `/speckit-specify` → (`/speckit-clarify` opcional) → `/speckit-plan` → `/speckit-tasks` → (`/speckit-analyze` opcional) → `/speckit-implement`.
- Specs vivem em `specs/<NNN-nome-curto>/`. A spec `001-presenca-mais` documenta o comportamento já existente do app como baseline (spec retroativa) e deve ser mantida atualizada conforme o app evolui.
- Toda spec de funcionalidade nova ou alterada deve terminar com uma seção de verificação executada de fato (Princípio V), não apenas planejada.

## Governance

Esta constituição tem precedência sobre convenções ad-hoc de código. Mudanças nos Princípios I–V exigem justificativa explícita no PR/commit e atualização deste arquivo com nova versão. Violações de escopo (ex.: introduzir backend, build step, ou dependência de pacote local) exigem decisão explícita do responsável pelo projeto antes de serem implementadas.

**Version**: 1.0.0 | **Ratified**: 2026-08-11 | **Last Amended**: 2026-08-11
