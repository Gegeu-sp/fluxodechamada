# Feature Specification: Backend Real no Firebase (Auth + Firestore)

**Feature Branch**: `002-firebase-presenca-real`

**Created**: 2026-08-12

**Status**: Draft

**Input**: "resolver esse projeto no firebase Fluxo-Aula, projeto: 175771227677, tem que ter uma página web e um banco de dados para poder comportar esses dados tipo diário mensal e a gente conseguir fazer suas análises"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Login de professor autorizado (Priority: P1)

Uma professora abre o link do site publicado e precisa entrar com uma conta autorizada antes de ver qualquer dado.

**Why this priority**: É o portão de tudo — sem login funcionando, nenhuma outra funcionalidade pode ser usada com segurança, já que os dados agora são reais.

**Independent Test**: Abrir o site sem estar logado → só a tela de login aparece, nenhum dado da aplicação é visível. Entrar com e-mail/senha de uma conta criada no Console do Firebase → a aplicação normal aparece.

**Acceptance Scenarios**:

1. **Given** ninguém logado, **When** o site carrega, **Then** só o formulário de login (e-mail + senha) é exibido; `.app` inteiro fica oculto.
2. **Given** o formulário de login, **When** credenciais corretas de uma conta existente são enviadas, **Then** o app libera o conteúdo normal e mostra o e-mail do usuário logado no lugar do avatar estático.
3. **Given** o formulário de login, **When** credenciais incorretas são enviadas, **Then** uma mensagem de erro aparece e o app continua bloqueado.
4. **Given** um usuário logado, **When** clica em "Sair", **Then** volta para a tela de login e o conteúdo fica oculto novamente.
5. **Given** o app, **When** qualquer pessoa procura por um formulário de "criar conta", **Then** não existe nenhuma tela de autocadastro — contas só existem se criadas manualmente no Console do Firebase.

---

### User Story 2 - Cadastrar turmas e alunos reais (Priority: P1)

Antes de registrar qualquer presença real, a professora precisa criar as turmas (ex.: Yoga às 08:00, Setor A) e os alunos matriculados nelas, já que nada disso existe pré-cadastrado.

**Why this priority**: Sem turmas e alunos reais não há o que registrar — é pré-requisito direto da User Story 3.

**Independent Test**: Na aba "Cadastros", criar um aluno novo, criar uma turma nova, matricular o aluno na turma, e confirmar que a turma aparece na aba "Presença do Dia" no(s) dia(s) da semana configurado(s).

**Acceptance Scenarios**:

1. **Given** a aba "Cadastros" > Alunos, **When** o usuário preenche nome e salva, **Then** um novo aluno é criado no Firestore e aparece na lista.
2. **Given** a aba "Cadastros" > Turmas, **When** o usuário preenche modalidade, horário, setor, capacidade e dias da semana, **Then** uma nova turma é criada no Firestore.
3. **Given** uma turma existente, **When** o usuário abre "Matricular alunos" e ativa o switch de um ou mais alunos, **Then** esses alunos passam a fazer parte de `alunoIds` da turma.
4. **Given** um aluno ou turma que já tem presença registrada, **When** o usuário tenta removê-lo, **Then** o sistema apenas o desativa (`ativo`/`ativa: false`), nunca exclui de fato — preservando o histórico de presença já registrado.
5. **Given** uma turma configurada para ocorrer às terças e quintas, **When** a data selecionada em "Presença do Dia" cai numa terça, **Then** a turma aparece na lista daquele dia; numa segunda, não aparece.

---

### User Story 3 - Registrar presença real (Priority: P1)

A professora abre uma turma do dia e marca quem compareceu — exatamente como no protótipo, mas agora isso é salvo de verdade no banco, visível de qualquer sessão/dispositivo, não apenas no navegador de quem registrou.

**Why this priority**: É o propósito central do produto — o "diário mensal" só existe se o registro diário for real e persistente.

**Independent Test**: Registrar presença de uma turma, abrir a mesma URL em outra sessão de navegador (sem cache/localStorage compartilhado) logada com outra conta autorizada, e confirmar que a mesma presença aparece — prova de que não é mais `localStorage`.

**Acceptance Scenarios**:

1. **Given** uma turma do dia sem presença registrada ainda, **When** o modal é aberto, **Then** todos os alunos matriculados aparecem como ausentes por padrão.
2. **Given** o modal de presença aberto, **When** o usuário alterna a presença de um aluno e fecha o modal, **Then** um documento é criado/atualizado em `presencas/{turmaId}_{data}` no Firestore com a lista de presentes.
3. **Given** uma presença já registrada para aquela turma+data, **When** o modal é reaberto (mesma sessão ou outra), **Then** o estado salvo é exibido, não o padrão "todos ausentes".
4. **Given** um usuário não autenticado tentando acessar o Firestore diretamente (fora do app), **When** a requisição é feita, **Then** as Security Rules recusam (nenhuma leitura/escrita sem `request.auth != null`).

---

### User Story 4 - Analisar presença real por período/modalidade/setor (Priority: P2)

Um gestor quer ver, na aba "Análise Gráfica", números reais de presença agregados por mês/modalidade/setor, calculados a partir do que foi de fato registrado — não mais simulado.

**Why this priority**: É o valor analítico do "diário mensal", mas depende das User Stories 1–3 já estarem funcionando com dados reais.

**Independent Test**: Registrar presença real em pelo menos 2 dias diferentes do mês corrente, abrir "Análise Gráfica" e confirmar que os KPIs e gráficos refletem exatamente esses registros (não valores aleatórios).

**Acceptance Scenarios**:

1. **Given** presenças reais registradas em algumas datas do mês, **When** a aba "Análise" é aberta, **Then** os gráficos mostram apenas os dias com registro real (dias sem registro não entram como "zero", ficam de fora do cálculo de médias).
2. **Given** filtros de modalidade/setor aplicados, **When** alterados, **Then** os KPIs/gráficos recalculam usando apenas presenças reais que casam com o filtro.

---

### User Story 5 - Desativar turma ou aluno sem perder histórico (Priority: P3)

Uma turma para de existir ou um aluno sai — a professora precisa "removê-lo" da lista ativa sem apagar o histórico de presença já registrado com ele.

**Why this priority**: Importante para manutenção de longo prazo, mas o sistema funciona (P1–P2) mesmo sem isso no dia 1.

**Independent Test**: Desativar um aluno; confirmar que ele some das novas listas de matrícula/presença, mas os registros antigos de presença que o incluíam continuam intactos no Firestore.

**Acceptance Scenarios**:

1. **Given** um aluno com histórico de presença, **When** desativado, **Then** documentos antigos em `presencas` não são alterados, apenas `alunos/{id}.ativo` vira `false`.

---

### Edge Cases

- Nenhuma turma configurada ainda para nenhum dia da semana → aba "Presença do Dia" mostra o mesmo estado vazio já existente ("Nenhuma aula encontrada").
- Firestore/rede indisponível ao carregar → mensagens de erro visíveis (reaproveitando o padrão de fallback já usado para falha do Chart.js), sem tela em branco/quebrada.
- Usuário desloga com o modal de presença aberto → ação bloqueada ou modal fecha e usuário volta ao login (não deve conseguir salvar depois de deslogado).
- Duas pessoas registram presença da mesma turma+data quase ao mesmo tempo → a última escrita vence (`atualizadoPor`/`atualizadoEm` permitem auditoria de quem sobrescreveu por último); não há merge automático nesta versão.
- Mês/período de análise sem nenhum registro real → KPIs mostram zero/vazio de forma explícita, não um erro.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema MUST exigir autenticação (Firebase Auth, e-mail/senha) antes de exibir qualquer dado ou tela funcional do app.
- **FR-002**: O sistema MUST NOT oferecer nenhuma tela de autocadastro — contas só são criadas manualmente pelo responsável via Console do Firebase.
- **FR-003**: O sistema MUST oferecer uma aba "Cadastros" para criar/editar Alunos (nome, ativo) e Turmas (modalidade, horário, dias da semana, setor, capacidade, alunos matriculados).
- **FR-004**: O sistema MUST permitir matricular/desmatricular alunos numa turma.
- **FR-005**: O sistema MUST derivar as "aulas do dia" a partir das turmas cadastradas cujo dia da semana bate com a data selecionada — não mais por geração aleatória.
- **FR-006**: O sistema MUST persistir presença registrada em Firestore (`presencas/{turmaId}_{data}`), substituindo `localStorage` como fonte de verdade.
- **FR-007**: O sistema MUST aplicar Firestore Security Rules que exigem `request.auth != null` para qualquer leitura/escrita em `alunos`, `turmas`, `presencas`, com deny-by-default para qualquer outro caminho.
- **FR-008**: O sistema MUST recalcular a aba "Análise Gráfica" a partir de presenças reais registradas no período (não da simulação antiga), considerando dias sem registro como "sem dado", não "zero".
- **FR-009**: O sistema MUST permitir desativar (não excluir) turmas e alunos, preservando presenças históricas já registradas.
- **FR-010**: O sistema MUST continuar funcionando sem bundler/build step — Firebase JS SDK e demais dependências carregadas via CDN, JS organizado em módulos ES nativos.
- **FR-011**: O sistema MUST oferecer logout, revogando o acesso visual ao app imediatamente.

### Key Entities

- **Aluno**: `{ nome, ativo, criadoEm }` — pessoa que pode ser matriculada em turmas.
- **Turma**: `{ modalidade, horario, diasSemana: number[], setor, capacidade, alunoIds: string[], ativa }` — aula recorrente semanal.
- **Presença**: `{ turmaId, data, presentes: string[], modalidade, setor, atualizadoPor, atualizadoEm }` — registro real de quem compareceu numa turma numa data específica; chave `turmaId_data`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Um usuário não autenticado não consegue ver nenhum dado do app (nem via UI, nem via acesso direto ao Firestore) — verificado tanto pela UI quanto pelas Security Rules.
- **SC-002**: Presença registrada numa sessão é visível em outra sessão/dispositivo autenticado, comprovando persistência real (não `localStorage`).
- **SC-003**: Zero ocorrências de `getDay()`, `mulberry32`, `hashStr` ou geração aleatória de dados de negócio no código final.
- **SC-004**: A aba "Análise Gráfica" reflete exatamente os registros reais feitos durante a verificação (nenhum dado inventado).
- **SC-005**: O app continua abrindo/funcionando como arquivo estático servido via Firebase Hosting, sem etapa de build.

## Assumptions

- Dias sem registro de presença ficam de fora das médias/KPIs da análise (não contam como zero) — decisão de produto assumida, não confirmada em detalhe com o usuário; revisar se o comportamento esperado for outro.
- O volume de dados (turmas, alunos, presenças) é pequeno o suficiente (uma academia/estúdio) para caber tranquilamente no plano gratuito do Firestore, sem necessidade de índices compostos além do estritamente necessário.
- O ID do projeto Firebase é `fluxo-aula` — não verificado por nós (sem acesso ao Console); se o ID real for diferente, `.firebaserc` precisa ser corrigido pelo usuário antes do deploy.
- O `firebaseConfig` completo (apiKey, authDomain, appId etc.) será preenchido pelo usuário após o scaffold, pois não temos acesso ao Console do Firebase deste ambiente.
- O código produzido aqui é verificado localmente contra o Firebase Local Emulator Suite (Auth + Firestore), não contra o projeto real — a verificação final contra o projeto real e o deploy dependem de passos que só o usuário pode executar (ver `specs/002-firebase-presenca-real/plan.md`).
