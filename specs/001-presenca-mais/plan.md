# Implementation Plan: Presença+ — Dashboard de Controle de Presença (Baseline)

**Branch**: `001-presenca-mais` | **Date**: 2026-08-11 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/001-presenca-mais/spec.md`

**Note**: Este plano documenta a arquitetura **tal como já construída** (as-built), não um plano prospectivo. Serve de referência técnica para futuras evoluções seguirem o mesmo padrão via `/speckit-plan`.

## Summary

`index.html` é uma single-page application estática, sem build, que simula um sistema de controle de presença em aulas de estúdio/academia. Todo o estado de "dados de negócio" (aulas, alunos, ocupação) é gerado no cliente por um PRNG determinístico semeado por data; a única persistência real é o `localStorage` para overrides de presença marcados pelo usuário. A UI é renderizada via manipulação direta do DOM (sem framework) e os gráficos usam Chart.js carregado por CDN.

## Technical Context

**Language/Version**: HTML5, CSS3, JavaScript ES6+ (vanilla, sem transpilação)

**Primary Dependencies**: Chart.js 4.4.3 (CDN jsdelivr), Fontsource Plus Jakarta Sans 400/500/600/700/800 (CDN jsdelivr)

**Storage**: `window.localStorage`, chave única `presenca_plus_v1`, valor JSON `{ [data]: { [idAula]: [idsAlunosPresentes] } }`

**Testing**: Nenhum framework de teste instalado. Verificação via navegador real (Playwright + Chromium), conforme Princípio V da constituição — ver `verification-report.md`.

**Target Platform**: Navegador (desktop e mobile), servido como arquivo estático (qualquer host estático ou `file://`)

**Project Type**: Single-page web app estática (arquivo único)

**Performance Goals**: Interações de filtro/UI devem responder em <1s percebido (SC-003); sem chamadas de rede além dos CDNs iniciais

**Constraints**: Sem build step; sem dependências instaláveis localmente; deve continuar funcional se o CDN do Chart.js falhar (degradação apenas da aba Análise)

**Scale/Scope**: 1 arquivo, ~815 linhas, 80 alunos simulados, 2 abas, 3 gráficos, 1 modal

## Constitution Check

*Baseado em `.specify/memory/constitution.md` v1.0.0.*

- **I. Single-File, Zero-Build**: ✅ Já respeitado — `index.html` único, sem bundler.
- **II. Client-Side Only, Dados Simulados**: ✅ Já respeitado — PRNG determinístico + `localStorage` apenas para overrides.
- **III. Português do Brasil**: ✅ Todos os textos visíveis em pt-BR.
- **IV. Responsivo por Contrato**: ✅ Breakpoints 920px/520px presentes no CSS.
- **V. Verificação Real**: Gate aplicado neste ciclo via verificação em navegador real (desktop + mobile) — ver `verification-report.md`.

Nenhuma violação a justificar em `Complexity Tracking`.

## Project Structure

### Documentation (this feature)

```text
specs/001-presenca-mais/
├── spec.md                  # Especificação retroativa (User Stories, FRs, Success Criteria)
├── plan.md                  # Este arquivo — arquitetura as-built
└── verification-report.md   # Resultado da verificação em navegador (desktop + mobile)
```

### Source Code (repository root)

```text
index.html   # Aplicação completa: markup, estilos (<style>) e lógica (<script>) inline
```

**Structure Decision**: Estrutura de arquivo único mantida — é uma decisão de arquitetura deliberada (Princípio I), não uma lacuna a preencher. Não há `src/`, `tests/` ou `backend/`/`frontend/` porque não há build nem servidor.

## Complexity Tracking

Nenhuma violação de constituição identificada nesta baseline — tabela não aplicável.
