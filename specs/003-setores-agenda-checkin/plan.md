# Implementation Plan: Setores Cadastráveis, Agenda Semanal e Check-in de 3 Estados

**Branch**: `003-setores-agenda-checkin` | **Date**: 2026-08-12 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/003-setores-agenda-checkin/spec.md`

## Summary

Três mudanças relacionadas no app Fluxo-Aula, já em produção: setores deixam de ser uma lista fixa A/B/C e viram uma coleção cadastrável (mesmo padrão de Alunos); o registro de presença passa de um switch binário para um check-in de 3 estados (`faltou`/`foi_nao_fez`/`foi_fez`); e a aba "Presença do Dia" ganha uma visão semanal (agenda) além da visão diária já existente.

## Technical Context

**Language/Version**: HTML5, CSS3, JavaScript ES6+ módulos nativos (inalterado)

**Primary Dependencies**: Firebase JS SDK v10 (Auth + Firestore), Chart.js (inalterado)

**Storage**: Cloud Firestore — nova coleção `setores`; `turmas.setor` passa a referenciar `setores/{id}`; `presencas.{id}.checkin` substitui `presencas.{id}.presentes`

**Testing**: Firebase Local Emulator Suite (Auth + Firestore) + Playwright/Chromium, mesma receita de `specs/002-firebase-presenca-real`

**Target Platform**: Navegador (desktop e mobile), Firebase Hosting

**Project Type**: Web app estática com backend gerenciado (BaaS) — inalterado

**Constraints**: Zero-build; toda mudança verificada em navegador real antes de considerada concluída (Princípio V)

**Scale/Scope**: Mudança incremental sobre uma base já pequena (uma academia/estúdio)

## Constitution Check

*Baseado em `.specify/memory/constitution.md` v2.1.0.*

- **I. Zero-Build, Módulos Nativos**: ✅ nenhuma dependência nova, só novos módulos/funções dentro da estrutura já existente.
- **II. Backend Real via Firebase**: ✅ nova coleção e novo formato de dado seguem o mesmo padrão de autenticação obrigatória já estabelecido.
- **III–IV**: ✅ pt-BR e responsividade mantidos, incluindo as telas novas.
- **V. Verificação Real**: verificação via Firebase Local Emulator Suite + Playwright, cobrindo as 3 histórias de usuário em desktop e mobile.

Nenhuma violação a justificar.

## Project Structure

### Documentation (this feature)

```text
specs/003-setores-agenda-checkin/
├── spec.md
├── plan.md                  # este arquivo
└── verification-report.md   # resultado da verificação via emulador + Playwright
```

### Source Code (arquivos afetados)

```text
firestore.rules             # + coleção setores; presencas valida checkin (map) em vez de presentes (list)
js/constants.js             # remove SECTORS; adiciona CHECKIN_STATUS
js/data.js                  # + listSetores/createSetor/updateSetor; getAulasDoDia com status/sectorName;
                             #   savePresenca(checkin); isAtendido/countAtendidos; getAulasDaSemana
js/ui-cadastros.js          # + sub-aba Setores (CRUD igual Alunos); seletor de setor dinâmico na turma
js/ui-presenca.js           # + toggle Dia/Semana; chips de setor dinâmicos; check-in de 3 estados no modal
js/ui-analise.js            # chips de setor dinâmicos; countAtendidos no lugar de presentes.length
index.html                  # markup da sub-aba Setores + modal; grade semanal; CSS novo
```

## Modelo de Dados Firestore (alterações)

```
setores/{id}
  nome: string
  ativo: boolean
  criadoEm: timestamp

turmas/{id}
  ...
  setor: string   // agora é o id de um documento em setores/{id}, não mais 'A'|'B'|'C'

presencas/{turmaId}_{data}
  ...
  checkin: { [alunoId: string]: 'faltou' | 'foi_nao_fez' | 'foi_fez' }   // substitui presentes: string[]
```

Regra de agregação usada em toda a aplicação: `status !== 'faltou'` conta como presença (função `isAtendido`/`countAtendidos` em `js/data.js`, única fonte da regra).

## Firestore Security Rules

Novo bloco `setores` (idêntico ao padrão de `alunos`). Bloco `presencas` passa a exigir `request.resource.data.checkin is map` em vez de `presentes is list`. Nenhuma outra regra muda.

## Checklist Manual

Como o app já está em produção, após a verificação local:

1. `firebase deploy --only firestore:rules` (novas regras de `setores` + `checkin`).
2. No Firestore do projeto real, apagar manualmente qualquer documento de teste em `presencas` criado antes desta mudança (formato antigo, incompatível).
3. Reabrir e salvar novamente as turmas de teste já existentes, escolhendo um setor real da nova lista (antes eram `'A'`/`'B'`/`'C'` sem setor cadastrado correspondente).
4. `firebase deploy --only hosting` (ou aguardar o deploy automático, se configurado).
5. Testar de verdade no site publicado: criar um setor, criar/editar uma turma com ele, registrar um check-in de cada um dos 3 estados, e conferir a visão semanal.

## Complexity Tracking

Nenhuma violação de constituição — mudança de escopo já registrada na spec e neste plano.
