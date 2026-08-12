# Presença+ Constitution

## Core Principles

### I. Zero-Build, Módulos Nativos
O produto é entregue como HTML/CSS/JS puros, sem etapa de build, bundler, transpilador ou gerenciador de pacotes local. A partir da v2.0.0, o JS pode ser dividido em múltiplos arquivos estáticos carregados via `<script type="module">` (ES modules nativos do navegador) — isso não viola "zero-build": nenhuma ferramenta de compilação entra no caminho, o navegador carrega os módulos diretamente. `index.html` continua sendo o único ponto de entrada HTML/CSS; os módulos JS vivem em `js/`. Dependências externas são permitidas apenas via CDN (ex.: Chart.js, Fontsource, Firebase JS SDK) e devem degradar de forma visível e não quebrar o restante da página quando indisponíveis (ex.: mensagem de erro no lugar do gráfico, como já ocorre com `chartsGrid`).

### II. Backend Real via Firebase (Auth + Firestore)
A partir da v2.0.0, o app usa um backend real: **Firebase Authentication** (e-mail/senha, contas criadas manualmente pelo responsável do projeto via Console — não há autocadastro em nenhuma tela do app) e **Cloud Firestore** como banco de dados para turmas, alunos e presenças. `localStorage` deixa de ser usado para dados de negócio (pode continuar sendo usado só para preferências efêmeras de UI, se necessário). Toda leitura/escrita no Firestore exige usuário autenticado (`request.auth != null` nas Security Rules) — não existe acesso anônimo aos dados. A `apiKey` do Firebase Web **não é segredo** e pode ser commitada; a segurança real vem das Firestore Security Rules, nunca de esconder a config do cliente.

### III. Português do Brasil, Interface Única
Toda a interface, textos, rótulos e mensagens são em pt-BR. Não há internacionalização. Nomenclatura de variáveis/IDs no código pode ser em inglês, mas todo texto visível ao usuário permanece em português.

### IV. Responsivo por Contrato (Breakpoints Fixos)
O layout DEVE continuar funcional nos três regimes já definidos em CSS: desktop (>920px), tablet (521–920px) e mobile (≤520px). Alterações de layout devem ser verificadas nos três regimes antes de serem consideradas concluídas — não apenas no viewport desktop.

### V. Verificação Real, Não Apenas Leitura de Código
Como não há suite de testes automatizada, toda alteração de comportamento visível ao usuário DEVE ser verificada executando o app de fato num navegador (Playwright/Chromium ou equivalente), cobrindo o fluxo afetado em pelo menos um viewport desktop e um mobile, antes de ser considerada concluída. Para fluxos que dependem do Firebase, a verificação de referência é contra o **Firebase Local Emulator Suite** (Auth + Firestore) quando não há credenciais/acesso ao projeto real disponíveis; isso deve ser deixado explícito no relatório de verificação, distinguindo-o de uma verificação contra o projeto de produção real. Alegar que "deveria funcionar" com base apenas na leitura do código não é verificação suficiente.

## Restrições Técnicas

- Sem frameworks (React/Vue/Angular etc.) e sem gerenciador de pacotes/bundler local (`package.json` de build) a menos que uma decisão explícita e documentada mude esse princípio. Uso de `npm`/`npx` como ferramenta auxiliar de *verificação* (ex.: Playwright, Firebase Emulator) é permitido e não conta como "build do produto".
- Dependências externas apenas via CDN com fallback visível de erro.
- Nenhuma credencial real de professor/aluno deve ser commitada. Contas de teste usadas em verificação local (emulador) não são credenciais reais.
- Nenhuma tela de autocadastro (self-signup) é permitida — contas só existem se criadas manualmente pelo responsável do projeto no Console do Firebase.

## Fluxo de Desenvolvimento (Spec-Driven)

- Novas funcionalidades seguem o fluxo do Spec Kit: `/speckit-specify` → (`/speckit-clarify` opcional) → `/speckit-plan` → `/speckit-tasks` → (`/speckit-analyze` opcional) → `/speckit-implement`.
- Specs vivem em `specs/<NNN-nome-curto>/`. A spec `001-presenca-mais` documenta o comportamento original (protótipo simulado) como baseline histórica; `002-firebase-presenca-real` documenta a migração para backend real via Firebase.
- Toda spec de funcionalidade nova ou alterada deve terminar com uma seção de verificação executada de fato (Princípio V), não apenas planejada.

## Governance

Esta constituição tem precedência sobre convenções ad-hoc de código. Mudanças nos Princípios I–V exigem justificativa explícita no PR/commit e atualização deste arquivo com nova versão. Violações de escopo (ex.: introduzir framework/bundler de build, ou UI de autocadastro) exigem decisão explícita do responsável pelo projeto antes de serem implementadas.

**Version**: 2.0.0 | **Ratified**: 2026-08-11 | **Last Amended**: 2026-08-12
