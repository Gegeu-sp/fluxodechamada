# Implementation Plan: Backend Real no Firebase (Auth + Firestore)

**Branch**: `002-firebase-presenca-real` | **Date**: 2026-08-12 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/002-firebase-presenca-real/spec.md`

## Summary

Substitui o gerador de dados falsos (PRNG) e a persistência via `localStorage` do Presença+ por um backend real no projeto Firebase "Fluxo-Aula" (ID assumido `fluxo-aula`, número `175771227677`): Firebase Authentication (e-mail/senha, contas manuais) protegendo o acesso, e Cloud Firestore como fonte de verdade para turmas, alunos e presenças. O JS deixa de ser um único bloco inline e passa a ser dividido em módulos ES nativos (`js/*.js`), sem introduzir bundler. Uma nova aba "Cadastros" permite criar turmas/alunos do zero, já que nenhum dado real existe hoje.

## Technical Context

**Language/Version**: HTML5, CSS3, JavaScript ES6+ módulos nativos (`<script type="module">`)

**Primary Dependencies**: Firebase JS SDK v10 modular (CDN `www.gstatic.com/firebasejs`), Chart.js 4.4.3 (já existente), Fontsource (já existente)

**Storage**: Cloud Firestore (`alunos`, `turmas`, `presencas`) — ver modelo de dados abaixo. `localStorage` não é mais usado para dados de negócio.

**Testing**: Sem framework de teste. Verificação via Firebase Local Emulator Suite (Auth+Firestore) + Playwright/Chromium contra o app real rodando localmente apontado para os emuladores — ver `verification-report.md` desta feature.

**Target Platform**: Navegador (desktop e mobile), Firebase Hosting

**Project Type**: Web app estática com backend gerenciado (BaaS) — sem servidor próprio

**Performance Goals**: Mesma sensação de resposta imediata de hoje nos toggles de presença (atualização otimista de UI + escrita em background no Firestore)

**Constraints**: Zero-build (Princípio I); todo acesso a dado exige autenticação (Princípio II); sem UI de autocadastro; app deve continuar funcionando como arquivo estático

**Scale/Scope**: Uma academia/estúdio — dezenas de turmas, no máximo algumas centenas de alunos, um punhado de contas de professor

## Constitution Check

*Baseado em `.specify/memory/constitution.md` v2.0.0 (já amendado para esta feature).*

- **I. Zero-Build, Módulos Nativos**: ✅ `js/*.js` via `<script type="module">`, sem bundler; Firebase SDK via CDN.
- **II. Backend Real via Firebase**: ✅ é exatamente o que esta feature implementa.
- **III. Português do Brasil**: ✅ todas as telas novas (login, Cadastros) em pt-BR.
- **IV. Responsivo por Contrato**: gate de login e Cadastros devem ser verificados nos 3 breakpoints também.
- **V. Verificação Real**: verificação via Firebase Local Emulator Suite + Playwright — explicitamente rotulada como "contra emulador local", não contra o projeto real (sem credenciais neste ambiente).

Nenhuma violação a justificar em `Complexity Tracking`.

## Project Structure

### Documentation (this feature)

```text
specs/002-firebase-presenca-real/
├── spec.md
├── plan.md                  # este arquivo
└── verification-report.md   # resultado da verificação via emulador + Playwright
```

### Source Code (repository root)

```text
index.html                 # HTML + <style> (quase inalterados) + <script type="module" src="js/main.js">
firebase.json               # config do Firebase Hosting
.firebaserc                 # alias do projeto ("default": "fluxo-aula")
firestore.rules             # regras de segurança do Firestore
js/
├── firebase-config.js       # firebaseConfig (placeholders) + initializeApp/getAuth/getFirestore
├── utils.js                 # $, toast, countUp, initials, fmt, pad2, cap, todayStr
├── constants.js              # MODS, MOD_KEYS, AV_COLORS, MONTHS_PT
├── auth.js                  # watchAuth, login, logout
├── data.js                  # camada Firestore: listTurmas, listAlunos, getAulasDoDia,
│                             #   savePresenca, getPresencasEntre, CRUD turma/aluno
├── ui-presenca.js            # renderDashboard, openModal, renderStudents, filteredClasses (async)
├── ui-analise.js             # analyticsData, renderCharts (Chart.js inalterado)
├── ui-cadastros.js           # CRUD de turmas/alunos, matrícula
└── main.js                   # entrypoint: wiring de eventos + watchAuth
```

**Structure Decision**: divisão em módulos ES nativos dentro de `js/` (sem subpastas por camada além dessa) — suficiente para o tamanho do projeto, evita complexidade de uma arquitetura maior (sem necessidade de `src/`, `tests/`, monorepo etc.).

## Modelo de Dados Firestore

```
alunos/{alunoId}
  nome: string
  ativo: boolean
  criadoEm: timestamp

turmas/{turmaId}
  modalidade: 'yoga'|'laboral'|'pilates'|'danca'|'funcional'
  horario: string 'HH:MM'
  diasSemana: number[]   // 0=Dom..6=Sáb, mesmo valor de Date.getDay()
  setor: 'A'|'B'|'C'
  capacidade: number
  alunoIds: string[]
  ativa: boolean

presencas/{turmaId}_{data}
  turmaId: string
  data: string 'YYYY-MM-DD'
  presentes: string[]     // alunoIds
  modalidade: string       // denormalizado, evita join na análise
  setor: string             // denormalizado
  atualizadoPor: string     // uid
  atualizadoEm: timestamp
```

Consultas:
- **Aulas do dia**: `listTurmas()` uma vez em memória (poucas dezenas de docs) → filtra `ativa && diasSemana.includes(dow)` → para cada uma, `getDoc('presencas/{turmaId}_{data}')` (existe → usa; não existe → todos ausentes a partir de `alunoIds`). Produz o mesmo formato de objeto que o antigo `getDay()` gerava, para reaproveitar `renderDashboard`/`openModal`/`renderStudents` quase sem mudanças.
- **Análise**: uma range query `where('data','>=',ini).where('data','<=',fim')` em `presencas` (campo único, sem índice composto), filtrando modalidade/setor em memória.

## Firestore Security Rules

`request.auth != null` obrigatório em `alunos`, `turmas`, `presencas`, com checagem de forma dos dados e `match /{document=**} { allow read, write: if false; }` como default-deny (ver texto completo em `firestore.rules` no repositório).

## Firebase Hosting

`firebase.json` com `"public": "."` (raiz do repo, sem pasta de build) e `.firebaserc` apontando para `fluxo-aula`. Serve como caminho de deploy manual (`firebase deploy --only hosting`) independente do App Hosting via GitHub funcionar automaticamente ou não.

## Checklist Manual (só o usuário pode fazer — sem credenciais Firebase neste ambiente)

1. Console → Authentication → Sign-in method → habilitar **E-mail/senha**.
2. Console → Authentication → Users → criar uma conta por professor (e-mail + senha).
3. Console → Firestore Database → criar o banco (modo produção) se ainda não existir.
4. Console → Configurações do projeto → Seus apps → Web app → copiar o `firebaseConfig` real para `js/firebase-config.js` (só os placeholders `COLE_AQUI`/valores de exemplo precisam ser substituídos).
5. Confirmar o Project ID real (pode ter sufixo) e corrigir `.firebaserc` se `fluxo-aula` estiver errado.
6. Localmente: `npm install -g firebase-tools && firebase login`.
7. `firebase deploy --only firestore:rules`.
8. Conferir no Console → App Hosting se o deploy automático via GitHub funcionou; se não, `firebase deploy --only hosting`.
9. Abrir o site publicado, logar com uma conta criada, ir em Cadastros, criar ≥1 aluno e turma reais, ir em Presença do Dia, registrar presença, recarregar e confirmar que persiste.
10. Deslogar e confirmar que o gate volta a bloquear o acesso.

## Complexity Tracking

Nenhuma violação de constituição não justificada — introdução de backend/Firebase é uma decisão explícita registrada nesta spec e na constituição v2.0.0, não uma exceção pontual.
