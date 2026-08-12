# Feature Specification: Setores Cadastráveis, Agenda Semanal e Check-in de 3 Estados

**Feature Branch**: `003-setores-agenda-checkin`

**Created**: 2026-08-12

**Status**: Draft

**Input**: Pedido do usuário após o primeiro deploy real: (1) setores deixarem de ser uma lista fixa A/B/C e virarem cadastráveis; (2) uma visão semanal tipo agenda dentro da aba "Presença do Dia"; (3) check-in de presença com 3 estados (Faltou / Foi mas não fez / Foi e fez) em vez do switch binário atual.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Cadastrar e usar setores reais (Priority: P1)

Uma gestora cadastra os setores reais do espaço (não mais limitados a A/B/C) e os usa ao criar turmas, filtrar aulas e analisar dados.

**Why this priority**: É pré-requisito das outras duas histórias — turmas e filtros de setor dependem de setores reais existirem.

**Independent Test**: Criar um setor em Cadastros, criar/editar uma turma escolhendo esse setor, e confirmar que ele aparece nos filtros de "Presença do Dia" e "Análise Gráfica".

**Acceptance Scenarios**:

1. **Given** a aba Cadastros, **When** o usuário cria um setor com um nome, **Then** ele passa a existir na lista de setores e pode ser escolhido ao cadastrar/editar uma turma.
2. **Given** uma turma sendo criada, **When** o usuário abre o campo Setor, **Then** vê apenas setores cadastrados e ativos, não mais A/B/C fixos.
3. **Given** setores cadastrados, **When** o usuário abre os filtros de setor em "Presença do Dia" ou "Análise Gráfica", **Then** os chips exibidos correspondem aos setores reais cadastrados, mais a opção "Todos os setores".
4. **Given** um setor desativado que ainda está associado a uma turma existente, **When** essa turma é reaberta para edição, **Then** o setor continua selecionado (não desaparece silenciosamente).

---

### User Story 2 - Registrar check-in de presença com 3 estados (Priority: P1)

Ao registrar a presença de uma turma, a professora marca cada aluno como "Faltou", "Foi, mas não fez" ou "Foi e fez" — nunca deixando um aluno sem status definido.

**Why this priority**: É o núcleo do valor do produto — o registro de presença deixa de ser binário e passa a refletir participação de fato.

**Independent Test**: Abrir o modal de uma turma, confirmar que todo aluno começa como "Faltou", marcar alguns como "Foi e fez" e outros como "Foi, mas não fez", fechar e reabrir o modal, e confirmar que os três estados persistiram corretamente.

**Acceptance Scenarios**:

1. **Given** o modal de presença aberto pela primeira vez para uma turma/data, **When** nenhuma ação foi tomada, **Then** todos os alunos aparecem como "Faltou" (nunca em branco/indefinido).
2. **Given** o modal aberto, **When** o usuário toca em um dos três estados para um aluno, **Then** aquele aluno passa a refletir o novo estado imediatamente e a alteração é salva.
3. **Given** o modal aberto, **When** o usuário usa "Todos fizeram" ou "Todos faltaram", **Then** todos os alunos visíveis mudam para o estado correspondente de uma vez.
4. **Given** uma turma com alunos em diferentes estados, **When** os indicadores da aba (Presentes hoje, ocupação, badge Lotada/Quase lotada/Tranquila) são calculados, **Then** qualquer aluno com status diferente de "Faltou" conta como presente.
5. **Given** a aba Análise Gráfica, **When** os KPIs e gráficos são calculados a partir de presenças reais, **Then** usam a mesma regra (diferente de "Faltou" = presente).

---

### User Story 3 - Visualizar a semana como agenda (Priority: P2)

Dentro da aba "Presença do Dia", a professora alterna para uma visão semanal e vê todas as aulas da semana organizadas por dia, incluindo turmas que ocorrem em mais de um dia.

**Why this priority**: É uma visão de apoio/planejamento — o registro diário (US2) já funciona sem ela; a agenda semanal é conveniência adicional.

**Independent Test**: Cadastrar uma turma que ocorre em 2+ dias da semana, alternar para "Semana", confirmar que ela aparece uma vez em cada dia correto, e que clicar em cada ocorrência abre o registro de presença do dia certo.

**Acceptance Scenarios**:

1. **Given** a aba "Presença do Dia", **When** o usuário alterna o toggle para "Semana", **Then** vê uma grade com os 7 dias da semana (Dom–Sáb) que contém a data selecionada, cada um com suas aulas.
2. **Given** uma turma configurada para ocorrer em mais de um dia da semana, **When** a visão semanal é exibida, **Then** essa turma aparece uma vez em cada dia configurado, cada ocorrência com sua própria data.
3. **Given** a visão semanal, **When** o usuário clica em uma aula de um dia específico, **Then** abre o mesmo modal de registro de presença já usado na visão diária, vinculado à data daquele dia (não à data global selecionada).
4. **Given** filtros de modalidade/setor aplicados, **When** a visão semanal é exibida, **Then** só mostra aulas que casam com os filtros, em cada dia.
5. **Given** um viewport mobile (≤520px), **When** a visão semanal é exibida, **Then** a grade de 7 colunas vira uma lista empilhada de um dia por linha, sem quebrar o layout.

---

### Edge Cases

- Turma com o mesmo horário em dois dias diferentes da semana → cada ocorrência é tratada de forma independente na visão semanal (documento de presença separado por dia).
- Setor apagado/desativado ainda referenciado por uma turma antiga → a turma continua funcionando, mostrando o nome do setor (ou o id bruto como fallback) em vez de quebrar.
- Nenhum setor cadastrado ainda → filtros mostram só "Todos os setores"; formulário de turma fica sem opções até que ao menos um setor exista.
- Presenças antigas gravadas antes desta mudança (formato `presentes: []`) → não são migradas automaticamente (ver Assumptions); passam a contar como "ninguém compareceu" nas telas novas.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema MUST permitir criar, editar e desativar setores (nome, ativo), com a mesma estrutura de cadastro já usada para alunos.
- **FR-002**: O sistema MUST usar a lista real de setores cadastrados (não uma lista fixa) para o campo Setor do formulário de turma e para os filtros de setor em "Presença do Dia" e "Análise Gráfica".
- **FR-003**: O sistema MUST registrar a presença de cada aluno em uma turma/data como um de três estados explícitos: `faltou`, `foi_nao_fez`, `foi_fez` — nunca um valor ausente/indefinido (aluno sem registro é tratado como `faltou`).
- **FR-004**: O sistema MUST oferecer ações em massa equivalentes a "marcar todos como fez" e "marcar todos como faltou".
- **FR-005**: O sistema MUST considerar qualquer status diferente de `faltou` como presença, de forma consistente, tanto nos indicadores da aba "Presença do Dia" quanto nos KPIs/gráficos da "Análise Gráfica".
- **FR-006**: O sistema MUST oferecer, dentro da aba "Presença do Dia", uma alternância entre visão "Dia" (comportamento atual) e visão "Semana" (agenda dos 7 dias contendo a data selecionada).
- **FR-007**: A visão semanal MUST exibir cada ocorrência de uma turma recorrente no(s) dia(s) da semana em que ela realmente acontece, cada ocorrência vinculada à sua própria data.
- **FR-008**: Clicar em uma aula na visão semanal MUST abrir o mesmo modal de registro de presença usado na visão diária, corretamente vinculado à data daquele dia específico.
- **FR-009**: O layout MUST continuar responsivo nos três regimes já definidos (desktop/tablet/mobile), incluindo a nova grade semanal e o novo seletor de check-in de 3 estados.

### Key Entities

- **Setor**: `{ nome, ativo, criadoEm }` — mesma estrutura de Aluno.
- **Turma** (atualizada): `setor` passa a ser o id de um documento em `setores`, não mais uma letra fixa.
- **Presença** (atualizada): `presentes: string[]` é substituído por `checkin: { [alunoId]: 'faltou' | 'foi_nao_fez' | 'foi_fez' }`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Zero ocorrências de setor hardcoded (`'A'`, `'B'`, `'C'`) ou do campo `presentes` no código final.
- **SC-002**: Uma turma cadastrada para ocorrer em 2+ dias da semana aparece corretamente em cada dia certo na visão semanal, com registro de presença independente por dia.
- **SC-003**: Em qualquer tela que mostre contagem/indicador de presença, o número bate com "quantidade de alunos com status diferente de faltou".
- **SC-004**: Nenhum aluno fica sem status definido em nenhum momento — reabrir uma turma sem presença registrada mostra todos como "Faltou" explicitamente.

## Assumptions

- **Sem migração automática de dados antigos**: dado o volume mínimo de dados reais existentes hoje (app recém-publicado), presenças antigas no formato `presentes: []` e turmas com `setor` sendo letra (A/B/C) não são migradas por código. Recomendação operacional: apagar manualmente presenças de teste antigas e reabrir/salvar as turmas de teste existentes (escolhendo um setor real da nova lista) após esta atualização.
- Os indicadores agregados (Presentes hoje, ocupação, KPIs de análise) não ganham uma nova quebra "fez vs. não fez" nesta versão — ambos contam igualmente como presença. Uma quebra adicional fica como possível melhoria futura, fora do escopo atual.
- A visão semanal não introduz novos KPIs agregados por semana — os cartões de estatística continuam refletindo apenas o dia selecionado, mesmo quando a visão "Semana" está ativa.
