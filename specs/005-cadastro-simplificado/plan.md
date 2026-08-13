# Implementation Plan: Cadastro Menos Fragmentado

**Branch**: `005-cadastro-simplificado` | **Date**: 2026-08-13 | **Spec**: [spec.md](./spec.md)

## Summary

Reorganização de UI apenas — **zero mudança de modelo de dados, de coleções ou de regras de segurança**. Três frentes: fundir Setores+Empresas num painel só, permitir cadastrar empresa/setor de dentro do formulário da turma, e encadear a matrícula logo após criar a turma.

## Technical Context

Mesmo stack (HTML/CSS/JS módulos nativos, Firestore, zero-build). Nenhuma dependência nova. Nenhuma migração de dados.

## Constitution Check

- **I. Zero-Build, Módulos Nativos**: ✅ só HTML/CSS/JS já existentes.
- **II. Backend Real via Firebase**: ✅ intocado — nenhuma coleção, campo ou regra muda.
- **III. Português do Brasil**: ✅ textos novos em pt-BR.
- **IV. Responsivo por Contrato**: painel fundido e a linha campo+botão precisam ser verificados no viewport mobile.
- **V. Verificação Real**: emulador + Playwright, desktop e mobile.

Nenhuma violação a justificar.

## Escopo da implementação

### 1. Painel único "Empresas e setores" (`index.html`, `js/ui-cadastros.js`)
- Sub-abas passam de 4 (`alunos`/`turmas`/`setores`/`empresas`) para 3 (`alunos`/`turmas`/`organizacao`).
- `#cad-setores` e `#cad-empresas` viram um `#cad-organizacao` único, com título por bloco e uma linha de texto explicando empresa vs. setor. Os ids internos (`empresasList`, `setoresList`, `btnNovaEmpresa`, `btnNovoSetor`, buscas) são preservados — o CRUD existente segue funcionando sem reescrita.
- `wireSubTabs` passa a mapear 3 painéis.

### 2. Cadastro inline no formulário da turma
- Botão "+ Nova/+ Novo" ao lado dos selects de Empresa e Setor (`.field-row` + `.btn-inline-add`).
- Uma variável `inlineTarget` registra de onde o cadastro foi disparado. Ao salvar, o item novo é selecionado no campo correspondente; ao fechar/cancelar, a variável é limpa.
- Empilhamento: a classe `.on-top` (z-index acima do padrão) é aplicada só quando o modal foi aberto de dentro do formulário — assim ele aparece **por cima** da turma, sem tocar no comportamento normal desses modais quando abertos pela lista.
- `refreshCadastros` passa a **preservar a seleção atual** dos selects de turma ao repopulá-los. Sem isso, qualquer refresh com o formulário aberto apagaria a escolha em andamento — que é exatamente o que o cadastro inline provoca.

### 3. Matrícula encadeada
- O submit do formulário de turma separa os dois caminhos: editar apenas salva; **criar** salva, fecha, e abre a matrícula daquela turma nova, com um toast dizendo o próximo passo.

### 4. Consistência visual dos selects
- `.field select` ganha o mesmo tratamento de `.field input` (fundo, borda, raio, foco), com seta própria em SVG inline — os selects nativos destoavam dos campos de texto, e isso ficou mais visível com os botões ao lado.

## Verification

Emulador + Playwright, desktop (1280×900) e mobile (390×844), cobrindo:
- 3 sub-abas e as duas listas convivendo no mesmo painel.
- Modal de empresa/setor abrindo **por cima** do formulário da turma (comparando z-index de fato, não só visibilidade), com a turma ainda aberta.
- Item cadastrado inline voltando selecionado, e campos preenchidos antes (horário/capacidade) intactos.
- Matrícula abrindo sozinha ao criar turma; turma resultante com o aluno matriculado.
- Edição de turma existente pré-selecionando empresa e setor corretos (prova que preservar a seleção no refresh não quebrou o caminho de edição).
- Sem scroll horizontal no painel fundido e no formulário, no mobile.
- Re-rodar as suites 003, 004 e a defensiva — os scripts precisam ser ajustados para as sub-abas novas e para a matrícula que agora abre sozinha (mudança de comportamento esperada, não regressão).
