# Feature Specification: Cadastro Menos Fragmentado

**Feature Branch**: `005-cadastro-simplificado`

**Created**: 2026-08-13

**Status**: Draft

**Input**: Feedback direto do usuário após usar a aba Cadastros com o campo Empresa já publicado: *"o cadastro está muito separado e confuso"*.

## Contexto do problema

Cadastrar uma turma exigia percorrer quatro sub-abas diferentes (Alunos, Turmas, Setores, Empresas) e, no meio do formulário da turma, descobrir que a empresa ou o setor ainda não existia — obrigando a **abandonar o formulário**, ir a outra aba, cadastrar, voltar e recomeçar do zero. Depois de salvar a turma, ainda era preciso caçar o botão "Matricular" para que a turma servisse pra alguma coisa.

Três causas concretas de fragmentação:

1. **Quatro sub-abas** para cinco tipos de cadastro, sendo que duas delas (Setores e Empresas) são listas simples de nome, quase idênticas.
2. **Beco sem saída no formulário da turma**: os seletores de Empresa e Setor só ofereciam o que já existia, sem caminho para criar na hora.
3. **Matrícula escondida**: criar a turma e matricular alunos eram dois passos desconectados, em telas diferentes.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Cadastrar uma turma do zero sem sair do lugar (Priority: P1)

Uma gestora abre "Nova turma" e, mesmo que a empresa e o setor daquela turma ainda não existam, consegue cadastrar tudo sem fechar o formulário nem perder o que já preencheu.

**Why this priority**: É o beco sem saída mais caro do fluxo atual — obriga a jogar fora o trabalho já feito no formulário.

**Independent Test**: Abrir "Nova turma", preencher horário e capacidade, cadastrar uma empresa e um setor novos pelos botões do próprio formulário, e confirmar que ambos voltam já selecionados e que horário/capacidade continuam preenchidos.

**Acceptance Scenarios**:

1. **Given** o formulário de turma aberto, **When** a usuária aciona "+ Nova" ao lado de Empresa, **Then** o cadastro de empresa abre por cima, com o formulário da turma intacto por baixo.
2. **Given** a empresa foi salva, **When** o cadastro fecha, **Then** a empresa recém-criada já aparece selecionada no campo Empresa da turma.
3. **Given** campos já preenchidos antes (horário, capacidade, dias), **When** uma empresa ou setor é cadastrado por ali, **Then** nenhum desses valores é perdido.
4. **Given** a usuária desiste e fecha o cadastro de empresa, **When** ela volta ao formulário, **Then** a turma continua aberta e nada foi alterado.

---

### User Story 2 - Encontrar empresas e setores num lugar só (Priority: P2)

Empresa e setor deixam de ser duas abas separadas e passam a conviver num único painel, com uma explicação curta da diferença entre os dois conceitos.

**Why this priority**: Reduz a navegação de 4 para 3 abas e resolve a confusão conceitual ("qual é a diferença mesmo?"), mas sozinha não elimina o beco sem saída da US1.

**Independent Test**: Abrir Cadastros e confirmar que existem 3 sub-abas, e que a terceira mostra as duas listas (Empresas e Setores) na mesma tela, cada uma com sua busca e seu botão de criar.

**Acceptance Scenarios**:

1. **Given** a aba Cadastros, **When** ela é aberta, **Then** existem exatamente 3 sub-abas: Alunos, Turmas, e "Empresas e setores".
2. **Given** o painel "Empresas e setores", **When** ele é exibido, **Then** mostra as duas listas separadas por títulos claros, cada uma com busca e botão próprio de criar.
3. **Given** o mesmo painel, **When** ele é exibido, **Then** traz uma explicação curta da diferença entre empresa (o cliente) e setor (o departamento dentro dela).

---

### User Story 3 - Não perder a matrícula de vista (Priority: P2)

Ao criar uma turma nova, a tela de matrícula abre em seguida, deixando explícito qual é o próximo passo.

**Why this priority**: Uma turma sem alunos não registra presença de ninguém; deixar a matrícula como passo escondido gera turmas incompletas.

**Independent Test**: Criar uma turma nova e confirmar que a matrícula abre sozinha; escolher um aluno, concluir, e confirmar que a turma aparece com 1 matriculado.

**Acceptance Scenarios**:

1. **Given** uma turma nova sendo salva, **When** o salvamento conclui, **Then** a tela de matrícula abre automaticamente para aquela turma.
2. **Given** a matrícula aberta automaticamente, **When** a usuária fecha sem escolher ninguém, **Then** a turma continua criada, apenas sem alunos.
3. **Given** uma turma **existente** sendo editada, **When** ela é salva, **Then** a matrícula **não** abre (só vale para turmas novas).

---

### Edge Cases

- Cadastrar empresa/setor pelo formulário da turma enquanto se **edita** uma turma existente → funciona igual, e a seleção anterior dos outros campos é preservada.
- Fechar o cadastro de empresa/setor clicando fora dele → fecha só ele, nunca o formulário da turma por baixo.
- Cadastro inline usado repetidamente (empresa e depois setor, em sequência) → cada um volta selecionado no seu campo, sem interferir no outro.

## Requirements *(mandatory)*

- **FR-001**: A aba Cadastros MUST ter exatamente 3 sub-abas: Alunos, Turmas, e "Empresas e setores".
- **FR-002**: O painel "Empresas e setores" MUST exibir as duas listas na mesma tela, cada uma com sua própria busca e botão de criar, e MUST explicar em texto curto a diferença entre os dois conceitos.
- **FR-003**: O formulário de turma MUST oferecer, ao lado dos campos Empresa e Setor, um caminho para cadastrar um item novo sem fechar o formulário.
- **FR-004**: Um item cadastrado por esse caminho MUST voltar já selecionado no campo correspondente.
- **FR-005**: Nenhum valor já preenchido no formulário de turma pode ser perdido quando um cadastro inline acontece.
- **FR-006**: O cadastro aberto por cima do formulário de turma MUST ficar visualmente acima dele, e fechá-lo NÃO pode fechar o formulário por baixo.
- **FR-007**: Ao criar uma turma **nova**, a tela de matrícula MUST abrir em seguida; ao **editar** uma turma existente, NÃO deve abrir.
- **FR-008**: Os campos de seleção (`select`) MUST ter o mesmo tratamento visual dos campos de texto já existentes.
- **FR-009**: O layout MUST continuar responsivo nos três regimes já definidos, sem scroll horizontal.

## Success Criteria *(mandatory)*

- **SC-001**: É possível cadastrar uma turma completa — incluindo empresa e setor inexistentes até então, e a matrícula dos alunos — sem sair da aba Turmas em nenhum momento.
- **SC-002**: O número de sub-abas de Cadastros cai de 4 para 3, sem que nenhuma funcionalidade de cadastro seja removida.
- **SC-003**: Nenhum campo preenchido é perdido em nenhum ponto do fluxo de criação de turma.

## Assumptions

- Empresa e setor continuam entidades independentes, sem hierarquia — esta feature só muda **onde** e **quando** são cadastrados, não o modelo de dados. Nenhuma alteração em Firestore ou nas regras de segurança.
- A matrícula abrir sozinha vale só para turmas novas; assumimos que ao editar uma turma a intenção é mexer na configuração, não nos alunos (que continuam acessíveis pelo botão "Matricular" do card).
- A explicação empresa vs. setor fica no painel de cadastro, onde a dúvida aparece, e não como um tour/onboarding separado — que seria mais estrutura do que o problema pede.
