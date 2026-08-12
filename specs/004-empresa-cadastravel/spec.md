# Feature Specification: Empresa como Campo Cadastrável Separado de Setor

**Feature Branch**: `004-empresa-cadastravel`

**Created**: 2026-08-12

**Status**: Draft

**Input**: Pedido do usuário depois de usar o Setor cadastrável (feature 003): "Setor" hoje mistura dois conceitos diferentes — a empresa/cliente do espaço (ex. "Contábil XYZ") e o departamento dela (ex. "Financeiro"). O usuário rejeitou explicitamente a alternativa de simplesmente digitar os dois juntos no campo Setor (ex. "Contábil XYZ - Financeiro") e pediu um campo "Empresa" genuinamente separado de "Setor".

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Cadastrar empresas reais (Priority: P1)

Uma gestora cadastra as empresas/clientes reais do espaço (ex. "Contábil XYZ", "Studio ABC") de forma independente dos setores/departamentos internos delas.

**Why this priority**: É pré-requisito das outras histórias — turmas e filtros por empresa dependem de empresas reais existirem.

**Independent Test**: Criar uma empresa em Cadastros, criar/editar uma turma escolhendo essa empresa e um setor, e confirmar que ambos aparecem separadamente na turma e nos filtros.

**Acceptance Scenarios**:

1. **Given** a aba Cadastros, **When** a usuária cria uma empresa com um nome, **Then** ela passa a existir na lista de empresas e pode ser escolhida ao cadastrar/editar uma turma, independentemente do setor escolhido.
2. **Given** uma turma sendo criada, **When** a usuária abre os campos Empresa e Setor, **Then** são dois seletores independentes, cada um com sua própria lista cadastrada.
3. **Given** empresas cadastradas, **When** a usuária abre os filtros em "Presença do Dia" ou "Análise Gráfica", **Then** existem chips de Empresa e de Setor lado a lado, cada um filtrando de forma independente (posso ver "Contábil XYZ" em qualquer setor, ou "Financeiro" de qualquer empresa).
4. **Given** uma empresa desativada que ainda está associada a uma turma existente, **When** essa turma é reaberta para edição, **Then** a empresa continua selecionada (não desaparece silenciosamente) — mesmo comportamento já existente para Setor.

---

### User Story 2 - Ver a empresa em qualquer tela que já mostra o setor (Priority: P2)

Em qualquer lugar do app que hoje mostra o Setor de uma turma/aula (cards do dia, agenda semanal, modal de presença, cartões de Cadastros), a Empresa aparece junto, sem exigir uma tela nova.

**Why this priority**: Sem isso, o campo existiria só no formulário — o valor de negócio (saber rapidamente "essa aula é de qual empresa") não se realizaria no dia a dia de uso.

**Independent Test**: Criar uma turma com Empresa "Contábil XYZ" e Setor "Financeiro"; conferir que "Contábil XYZ" aparece no card do dia, na agenda semanal, no modal de presença e no card de Cadastros — sempre ao lado do Setor, nunca substituindo-o.

**Acceptance Scenarios**:

1. **Given** uma turma com empresa e setor cadastrados, **When** ela aparece em "Presença do Dia" (card do dia ou item da agenda semanal), **Then** o nome da empresa aparece junto com o nome do setor.
2. **Given** o modal de registro de presença, **When** ele é aberto para uma turma, **Then** o subtítulo mostra empresa e setor.
3. **Given** a lista de turmas em Cadastros, **When** uma turma é listada, **Then** o card mostra empresa e setor.

---

## Edge Cases

- Turma antiga (criada antes desta mudança) sem campo `empresa` → continua funcionando, mostrando "—" no lugar do nome da empresa em vez de quebrar (mesmo padrão de fallback já usado para setor desconhecido).
- Nenhuma empresa cadastrada ainda → filtros mostram só "Todas as empresas"; formulário de turma fica sem opções de empresa até que ao menos uma exista (mesmo comportamento já existente para Setor sem opções).
- Empresa e Setor são entidades completamente independentes nesta versão — não existe hierarquia (uma empresa não "contém" setores específicos dela); qualquer setor pode ser combinado com qualquer empresa. Modelar hierarquia fica fora do escopo, pois não foi pedido.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema MUST permitir criar, editar e desativar empresas (nome, ativo), com a mesma estrutura e fluxo de cadastro já usados para setores.
- **FR-002**: O sistema MUST tratar Empresa e Setor como dois campos independentes em Turma — nenhum depende ou deriva do outro.
- **FR-003**: O formulário de turma MUST exigir a escolha de uma Empresa cadastrada e ativa, da mesma forma que já exige um Setor.
- **FR-004**: Toda tela que hoje exibe o Setor de uma aula/turma (cards de "Presença do Dia", agenda semanal, modal de presença, cartões de "Cadastros") MUST exibir também o nome da Empresa.
- **FR-005**: Os filtros de "Presença do Dia" e "Análise Gráfica" MUST oferecer um chip de Empresa, funcionando de forma independente do chip de Setor (E lógico entre os dois, cada um podendo estar em "Todos/Todas").
- **FR-006**: Presenças salvas MUST denormalizar a empresa da turma (mesmo padrão já usado para modalidade e setor), para permitir filtro por empresa na Análise sem joins.

### Key Entities

- **Empresa**: `{ nome, ativo, criadoEm }` — mesma estrutura de Setor/Aluno.
- **Turma** (atualizada): ganha o campo `empresa` (id de um documento em `empresas`), adicional e independente do campo `setor` já existente.
- **Presença** (atualizada): ganha o campo `empresa` denormalizado, adicional ao `modalidade`/`setor` já existentes.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: É possível cadastrar duas turmas com a mesma Empresa e Setores diferentes, e duas turmas com o mesmo Setor e Empresas diferentes, sem nenhuma restrição cruzada.
- **SC-002**: Toda tela que já mostra Setor também mostra Empresa, sem quebrar layout em nenhum dos três breakpoints responsivos já definidos.
- **SC-003**: Filtrar por Empresa em "Presença do Dia"/"Análise Gráfica" retorna exatamente as turmas/presenças daquela empresa, independentemente do setor.

## Assumptions

- **Sem migração automática de dados antigos**: turmas cadastradas antes desta mudança não têm o campo `empresa`; não são migradas por código — mesma decisão operacional já tomada na feature 003 (recomenda-se reabrir e salvar novamente as turmas existentes, agora escolhendo também uma empresa).
- Não é modelada nenhuma relação entre Empresa e Setor (não é uma hierarquia empresa→setores-dela); ambos são listas cadastráveis totalmente independentes, por não ter sido esse o pedido.
- Nenhum novo KPI/gráfico agregado por empresa é introduzido nesta versão — o filtro de Empresa afeta os KPIs/gráficos já existentes (mesmo padrão do filtro de Setor), sem adicionar uma quebra visual nova "por empresa".
