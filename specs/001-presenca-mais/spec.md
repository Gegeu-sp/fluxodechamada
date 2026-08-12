# Feature Specification: Presença+ — Dashboard de Controle de Presença (Baseline)

**Feature Branch**: `001-presenca-mais`

**Created**: 2026-08-11

**Status**: Implemented (spec retroativa — documenta o comportamento já existente em `index.html`)

**Input**: Documentação retroativa do protótipo estático "Presença+" já implementado no repositório, como baseline formal para orientar evoluções futuras via Spec Kit.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Registrar presença de uma aula do dia (Priority: P1)

Uma professora/recepcionista abre o app no dia da aula, encontra a turma na lista (filtrando por data/modalidade/setor se necessário), abre o registro da turma e marca quem está presente.

**Why this priority**: É a ação central do produto — sem ela o app não tem propósito. Todas as demais telas (analytics) dependem dos dados registrados aqui (ou simulados na mesma lógica).

**Independent Test**: Abrir o app, clicar em qualquer card de aula na aba "Presença do Dia", alternar a presença de um ou mais alunos no modal, fechar o modal e confirmar que o card e os cartões de estatística no topo refletem a nova contagem.

**Acceptance Scenarios**:

1. **Given** a aba "Presença do Dia" ativa com pelo menos uma aula listada, **When** o usuário clica no card de uma aula, **Then** abre um modal com o nome da modalidade, horário, setor, capacidade, lista de alunos matriculados e o estado atual de presença de cada um.
2. **Given** o modal de uma aula aberto, **When** o usuário clica no switch de um aluno, **Then** o estado de presença daquele aluno alterna imediatamente, o contador "X / Y presentes" e a barra de progresso do modal são atualizados, e a alteração é persistida em `localStorage`.
3. **Given** o modal aberto, **When** o usuário clica em "Marcar todos" ou "Desmarcar todos", **Then** todos os alunos da lista visível (não filtrada pela busca) mudam de estado de uma vez e o contador é atualizado.
4. **Given** o modal aberto, **When** o usuário clica em "Concluído", no "✕", fora do modal, ou pressiona Esc, **Then** o modal fecha, um toast de confirmação aparece com o resumo "X/Y" da aula, e a lista/cartões de estatística da aba "Presença do Dia" são recalculados.

---

### User Story 2 - Filtrar as aulas do dia por data, modalidade e setor (Priority: P1)

O usuário quer ver rapidamente apenas as aulas relevantes: de uma data específica, de uma modalidade específica (Yoga, Laboral, Pilates, Dança, Funcional) e/ou de um setor específico (A, B, C).

**Why this priority**: Sem filtros, listas com muitas aulas por dia ficam inutilizáveis; é essencial para o uso diário do produto.

**Independent Test**: Alterar a data no seletor, o select de modalidade e os chips de setor, um de cada vez, e confirmar que a grade de aulas e os 4 cartões de estatística do topo (Presentes, Previstos, Taxa de ocupação, Aulas do dia) mudam de acordo.

**Acceptance Scenarios**:

1. **Given** a aba "Presença do Dia", **When** o usuário escolhe outra data no campo de data, **Then** a grade de aulas é regerada para aquela data (respeitando os overrides de presença já salvos para ela) e os cartões de estatística são recalculados.
2. **Given** uma modalidade selecionada no filtro, **When** não existem aulas daquela modalidade na data/setor atuais, **Then** é exibido um estado vazio ("Nenhuma aula encontrada") com um botão "Limpar filtros" que restaura modalidade e setor para "todos".
3. **Given** os chips de setor, **When** o usuário clica em um setor específico (A/B/C), **Then** apenas aulas daquele setor aparecem e o chip clicado fica visualmente ativo (os demais desativam).

---

### User Story 3 - Buscar um aluno dentro do modal de presença (Priority: P2)

Dentro do modal de uma aula com muitos alunos, o usuário digita parte de um nome para localizar rapidamente aquele aluno e marcar sua presença.

**Why this priority**: Melhora a usabilidade em turmas grandes, mas o registro continua possível (rolando a lista) sem essa funcionalidade — por isso prioridade P2, não P1.

**Independent Test**: Abrir um modal de aula com vários alunos, digitar um termo de busca parcial no campo de busca e confirmar que a lista filtra em tempo real, incluindo o caso de nenhum resultado.

**Acceptance Scenarios**:

1. **Given** o modal aberto com N alunos, **When** o usuário digita um termo que casa parcialmente (case-insensitive) com o nome de alguns alunos, **Then** apenas esses alunos permanecem visíveis na lista.
2. **Given** um termo de busca sem nenhuma correspondência, **When** a busca é aplicada, **Then** é exibida a mensagem "Nenhum aluno encontrado 🔍" no lugar da lista.
3. **Given** um termo de busca ativo, **When** o usuário fecha e reabre o modal (nova aula), **Then** o campo de busca é limpo.

---

### User Story 4 - Analisar presença histórica e por modalidade (Priority: P2)

Um gestor quer visualizar tendências: presenças diárias em um mês, comparação com o mesmo mês do ano anterior, e distribuição de ocupação entre modalidades.

**Why this priority**: É valor analítico complementar ao registro diário (P1); o produto continua útil sem esta aba, mas ela é o segundo pilar declarado do app ("Análise Gráfica" é uma das duas abas principais).

**Independent Test**: Trocar para a aba "Análise Gráfica", alterar o mês/modalidade/setor nos filtros, e confirmar que os 4 KPIs e os 3 gráficos (barras diárias, linha anual comparativa, donut de ocupação por modalidade) são recalculados e re-renderizados.

**Acceptance Scenarios**:

1. **Given** a aba "Análise Gráfica" ativa, **When** a página carrega essa aba pela primeira vez, **Then** os KPIs (Total de presenças no ano, Média mensal, Delta vs. ano anterior, Melhor mês) e os três gráficos são renderizados com dados do mês corrente.
2. **Given** o mês selecionado é o mês corrente, **When** os dados diários são calculados, **Then** apenas os dias até hoje entram no gráfico de barras (dias futuros ficam nulos/sem barra) e o rótulo indica "considerado até hoje"; para meses passados o rótulo indica "mês completo".
3. **Given** filtros de modalidade e/ou setor aplicados na aba de análise, **When** alterados, **Then** os três gráficos e a legenda do donut são recalculados apenas com as aulas que casam o filtro.
4. **Given** a biblioteca Chart.js não carregar (ex.: falha de rede no CDN), **When** o usuário abre a aba "Análise Gráfica", **Then** uma mensagem de erro amigável substitui a área de gráficos em vez de quebrar a página.

---

### Edge Cases

- Nenhuma aula corresponde aos filtros ativos na aba "Presença do Dia" → estado vazio com ação de "Limpar filtros".
- Busca de aluno sem correspondência dentro do modal → mensagem "Nenhum aluno encontrado".
- Mês selecionado na aba Análise é o mês corrente → dias futuros do mês são excluídos do gráfico diário (não contam como zero).
- Ano anterior sem dados equivalentes (delta) → o cálculo do delta usa `0` como divisor apenas se `prevPeriod` for zero, retornando delta `0` nesse caso (evita divisão por zero).
- Capacidade de uma aula = presença registrada → status "Lotada" (badge vermelho); ≥75% → "Quase lotada" (amarelo); abaixo disso → "Tranquila" (verde).
- Presença marcada manualmente pelo usuário é persistida por `data + id da aula` em `localStorage`; ao recarregar a página no mesmo dia, os overrides são reaplicados sobre os dados simulados gerados para aquela data.
- Viewport ≤920px: grade de estatísticas passa a 2 colunas, grade de gráficos vira coluna única, chips de filtro perdem a margem automática à esquerda. Viewport ≤520px: estatísticas em 1 coluna, abas com padding reduzido, cabeçalho centralizado.
- Falha ao carregar Chart.js (offline/CDN bloqueado) → aba Análise mostra mensagem de erro em vez de gráficos quebrados; a aba Presença continua 100% funcional (não depende de Chart.js).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema DEVE gerar, de forma determinística por data (mesma data → mesmo resultado), uma lista de aulas do dia com horário, modalidade, setor (A/B/C) e capacidade.
- **FR-002**: O sistema DEVE exibir, na aba "Presença do Dia", 4 indicadores agregados (presentes, previstos/capacidade total, taxa de ocupação, número de aulas) que reagem aos filtros de data/modalidade/setor.
- **FR-003**: O sistema DEVE permitir filtrar as aulas exibidas por data (seletor de data), modalidade (select) e setor (chips A/B/C/Todos), combinando os três filtros com "E lógico".
- **FR-004**: O sistema DEVE, para cada aula listada, indicar visualmente seu status de ocupação (Tranquila/Quase lotada/Lotada) com base na razão presentes/capacidade.
- **FR-005**: O sistema DEVE abrir um modal de registro de presença ao clicar em uma aula, listando todos os alunos matriculados com seu estado de presença atual.
- **FR-006**: O sistema DEVE permitir alternar a presença de um aluno individualmente, marcar todos ou desmarcar todos os alunos visíveis no modal.
- **FR-007**: O sistema DEVE permitir buscar alunos por nome (parcial, case-insensitive) dentro do modal, sem afetar os dados dos demais alunos.
- **FR-008**: O sistema DEVE persistir as alterações de presença feitas pelo usuário em `localStorage`, associadas à data e ao identificador da aula, e reaplicá-las ao recarregar a página.
- **FR-009**: O sistema DEVE exibir uma notificação (toast) ao concluir/fechar o registro de uma aula, resumindo presentes/capacidade.
- **FR-010**: O sistema DEVE oferecer uma aba "Análise Gráfica" com 4 KPIs anuais/mensais (total de presenças no ano, média mensal, variação percentual vs. ano anterior, melhor mês) recalculados conforme os filtros de mês/modalidade/setor.
- **FR-011**: O sistema DEVE renderizar três visualizações na aba de análise: gráfico de barras de presenças diárias do mês selecionado, gráfico de linha comparando o ano selecionado com o ano anterior mês a mês, e gráfico de donut de ocupação por modalidade com legenda detalhada.
- **FR-012**: O sistema DEVE tratar a ausência da biblioteca de gráficos (Chart.js) sem quebrar a página, exibindo uma mensagem de erro no lugar dos gráficos.
- **FR-013**: O layout DEVE se adaptar a três faixas de largura (desktop >920px, tablet 521–920px, mobile ≤520px) sem perda de funcionalidade.
- **FR-014**: Todos os textos visíveis ao usuário DEVEM estar em português do Brasil.

### Key Entities

- **Aula (class)**: horário, modalidade, setor (A/B/C), capacidade, lista de alunos matriculados com estado de presença. Identificada por `data_horário_modalidade_setor`. Gerada deterministicamente por dia; não persiste entre sessões exceto pelos overrides de presença.
- **Aluno (student)**: id numérico e nome; conjunto fixo de 80 alunos gerado uma única vez por seed fixa (`20240613`), reaproveitado entre todas as aulas/dias.
- **Override de presença**: registro em `localStorage` (`presenca_plus_v1`), mapeando `data → id da aula → lista de ids de alunos presentes`. É a única entidade realmente persistida entre sessões.
- **Modalidade**: um de {Yoga, Laboral, Pilates, Dança, Funcional}, cada uma com nome, emoji, cor e "popularidade" (probabilidade de presença) fixos no código (`MODS`).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Um usuário consegue registrar a presença completa de uma turma (abrir aula → marcar presentes → concluir) em menos de 5 interações de clique/toque, sem recarregar a página.
- **SC-002**: Após marcar presença e recarregar a página no mesmo dia, 100% das alterações feitas permanecem refletidas (persistência via `localStorage` funcional).
- **SC-003**: Trocar qualquer filtro (data, modalidade, setor, mês) atualiza a UI correspondente em menos de 1 segundo perceptível, sem recarregar a página.
- **SC-004**: O app é 100% operável (todas as ações de User Story 1–3) em um viewport mobile de 390px de largura, sem scroll horizontal e sem elementos sobrepostos.
- **SC-005**: Se o CDN do Chart.js estiver indisponível, a aba "Presença do Dia" continua 100% funcional e a aba "Análise" degrada de forma visível (mensagem), sem erro de JavaScript não tratado.

## Assumptions

- O app é um protótipo de demonstração com dados simulados (declarado no rodapé); não há expectativa de dados reais de alunos ou integração com sistemas externos.
- Não há autenticação/autorização — qualquer pessoa com acesso ao arquivo tem acesso total a todas as funcionalidades (avatar "Prof. Renata Prado" é apenas decorativo/estático).
- Não há sincronização entre dispositivos/usuários — `localStorage` é local ao navegador; abrir em outro navegador/dispositivo não compartilha os overrides de presença.
- O ambiente de execução tem acesso à internet para carregar as fontes e o Chart.js via CDN; degradação sem internet é aceitável desde que não quebre a página (ver FR-012).
- Este documento formaliza o comportamento **já implementado**; ele não introduz escopo novo, servindo como baseline para futuras specs geradas via `/speckit-specify`.
