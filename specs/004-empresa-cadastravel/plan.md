# Implementation Plan: Empresa como Campo Cadastrável Separado de Setor

**Branch**: `004-empresa-cadastravel` | **Date**: 2026-08-12 | **Spec**: [spec.md](./spec.md)

## Summary

Adiciona `empresas` como uma quarta coleção cadastrável no Firestore, seguindo exatamente o mesmo padrão já usado por `setores` (feature 003): CRUD idêntico, mesmo modal, mesma sub-aba em Cadastros. Turma ganha um campo `empresa` (id de `empresas`) adicional e independente do `setor` já existente — os dois não têm relação hierárquica. Toda tela que hoje mostra o Setor de uma aula passa a mostrar também a Empresa.

## Technical Context

Mesmo stack de sempre (HTML/CSS/JS módulos nativos, Firestore, zero-build). Nenhuma dependência nova.

## Constitution Check

- **I. Zero-Build, Módulos Nativos**: ✅ reaproveita o padrão de módulos já existente.
- **II. Backend Real via Firebase**: ✅ nova coleção `empresas`, mesmas regras de segurança do padrão já usado.
- **III. Português do Brasil**: ✅.
- **IV. Responsivo por Contrato**: chips e select adicionais reaproveitam classes CSS já responsivas (`.chips`/`.chip`, `.field`), sem CSS novo necessário.
- **V. Verificação Real**: via Firebase Local Emulator Suite + Playwright, mesma receita de 002/003.

Nenhuma violação a justificar.

## Escopo da implementação

### 1. Firestore
- Nova coleção `empresas/{id}`: `{ nome, ativo, criadoEm }` — cópia exata de `setores`.
- `turmas.empresa`: novo campo, id de documento em `empresas`. Independente de `turmas.setor`.
- `presencas.empresa`: novo campo denormalizado, mesmo padrão de `modalidade`/`setor`.

### 2. `firestore.rules`
- Novo bloco `empresas` (cópia do padrão de `setores`).
- Bloco `turmas` passa a exigir também `request.resource.data.empresa is string`.

### 3. `js/data.js`
- `listEmpresas`, `createEmpresa`, `updateEmpresa` (espelham as de setores), cache próprio invalidado junto dos demais.
- `createTurma`/`savePresenca`: aceitam e persistem `empresa`.
- `getAulasDoDia`: carrega `listEmpresas()` também; cada aula ganha `empresa` (id bruto) e `empresaName` (resolvido, com fallback `'—'` para turmas antigas sem o campo).
- `getPresencasEntre`: novo filtro opcional `empresa`.

### 4. Cadastros — nova sub-aba "Empresas" + seletor na turma
- Sub-aba "Empresas" em Cadastros: CRUD idêntico ao de Setores (mesmo modal, mesmo padrão visual, `#modalEmpresa`/`#empresaForm`).
- `<select id="turmaEmpresa">` no formulário de turma, populado dinamicamente como o de Setor, com o mesmo fallback para empresa desativada/removida ainda vinculada a uma turma.
- Cards de turma e de matrícula passam a mostrar Empresa · Setor.

### 5. Presença do Dia e Análise Gráfica
- Novo chip `#fEmpresa` (Presença do Dia) e `#fEmpresaA` (Análise), lado a lado com os chips de Setor já existentes, mesmo padrão de renderização dinâmica.
- `matchesFilters` (Presença) e `filter` (Análise) passam a considerar empresa, em E lógico com modalidade e setor.
- Cards do dia, itens da agenda semanal e subtítulo do modal de presença passam a mostrar Empresa · Setor.

### 6. Migração de dados existentes
- Sem script de migração, mesma decisão já registrada na feature 003: recomendação operacional é reabrir/salvar de novo as turmas existentes escolhendo também uma empresa, depois do deploy desta mudança.

## Verification

Mesma receita de 002/003: Firebase Local Emulator Suite (`fluxo-aula`, auth+firestore) + Playwright/Chromium, SDK do Firebase servido localmente via pacote npm (gstatic bloqueado neste sandbox). Cobrir:
- Criar empresa em Cadastros, confirmar que aparece no seletor da turma e nos chips de filtro, independente do setor.
- Criar turma com Empresa X + Setor A e outra com Empresa X + Setor B (mesma empresa, setores diferentes) — confirmar que ambas aparecem corretamente e que filtrar por Empresa X retorna as duas, enquanto filtrar por Setor A retorna só uma.
- Confirmar que Empresa aparece nos cards do dia, na agenda semanal e no modal de presença, junto com o Setor.
- Desktop (1280×900) e mobile (390×844), sem scroll horizontal, sem erros de JS não tratados.
- Deixar explícito no relatório: verificação contra o emulador local, não contra o projeto real.
