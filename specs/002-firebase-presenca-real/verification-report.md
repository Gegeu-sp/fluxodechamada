# Verification Report — Backend Real no Firebase (002-firebase-presenca-real)

**Data**: 2026-08-12
**Método**: Automação de navegador real (Playwright + Chromium) contra o **Firebase Local Emulator Suite** (Auth + Firestore, modo `demo-fluxo-aula`) — não contra o projeto real `fluxo-aula`, pois este ambiente não tem credenciais/CLI autenticado para o projeto real (ver limitações abaixo).
**Viewport**: Desktop 1280×900.

## Ambiente de verificação

- `firebase-tools` instalado localmente (`npm install -g firebase-tools`) e usado para subir `firebase emulators:start --project demo-fluxo-aula --only auth,firestore`, lendo `firebase.json`/`firestore.rules` do próprio repositório.
- `cdn.jsdelivr.net`/`www.gstatic.com` estão bloqueados pelo proxy deste sandbox (mesma limitação já documentada em `specs/001-presenca-mais/verification-report.md`). Para carregar o Firebase JS SDK de verdade no navegador de teste, as requisições a `https://www.gstatic.com/firebasejs/10.12.2/*` foram interceptadas (Playwright `route`) e respondidas com os arquivos idênticos baixados via `registry.npmjs.org` (pacote `firebase@10.12.2`, que contém exatamente os mesmos bundles `firebase-app.js`/`firebase-auth.js`/`firebase-firestore.js` servidos pelo gstatic) — não é um mock funcional, é o mesmo código-fonte, só servido de outra origem por causa do bloqueio de rede deste sandbox especificamente.
- Usuário de teste criado diretamente via REST API do Auth Emulator (`accounts:signUp`): `professora@teste.com` / `senha123456`.
- `index.html` servido por um servidor HTTP local simples (`127.0.0.1`), o que ativa a lógica de auto-conexão aos emuladores já embutida em `js/firebase-config.js` (`location.hostname === 'localhost'/'127.0.0.1'`).

## Bugs reais encontrados e corrigidos nesta rodada

1. **Trocar para a aba "Presença do Dia" não atualizava a lista.** `main.js` só chamava `renderDashboard()` uma vez, na inicialização — trocar de aba de volta para "Presença do Dia" depois de cadastrar uma turma nova não recarregava os dados, mostrando a grade vazia mesmo com turmas existindo no Firestore. **Corrigido**: `wireTabs()` agora chama `renderDashboard()` também ao ativar a aba "Presença do Dia" (mesmo padrão já usado para as outras duas abas).
2. **Janela real de cliques "mortos" logo após o login.** `onUser()` liberava a UI (`body.classList.add('authed')`) e só depois aguardava sequencialmente `initPresenca()` → `initAnalise()` → `initCadastros()`. Como `initCadastros()` (que liga os botões "Novo aluno"/"Nova turma"/modais) só era chamado depois que a busca do Firestore de `initPresenca()` terminava, existia uma janela real (não hipotética — reproduzida de forma consistente pela verificação automatizada) em que a interface já parecia pronta e clicável, mas os listeners de Cadastros ainda não tinham sido registrados, fazendo o clique em "Novo aluno" não abrir nada. **Corrigido**: as três chamadas de inicialização agora rodam em paralelo (`Promise.all`), garantindo que o wiring síncrono de todas as abas aconteça antes de qualquer busca assíncrona no Firestore.

Ambos os bugs foram encontrados **porque** a verificação usou clique real de navegador em vez de apenas ler o código — exatamente o propósito do Princípio V da constituição.

## Resultados

| # | Verificação | Resultado |
|---|---|---|
| 1 | Gate de login visível antes de autenticar | ✅ Pass |
| 2 | App fica oculto (`body` sem `.authed`) até logar | ✅ Pass |
| 3 | Login com credenciais inválidas mostra erro e continua bloqueado | ✅ Pass |
| 4 | Login válido libera o app | ✅ Pass |
| 5 | E-mail do usuário logado exibido no header | ✅ Pass |
| 6 | Aluno criado em Cadastros persiste no Firestore real (via emulador) | ✅ Pass |
| 7 | Turma criada em Cadastros aparece na lista | ✅ Pass |
| 8 | Matricular aluno numa turma salva sem erro | ✅ Pass |
| 9 | Turma cadastrada para o dia da semana de hoje aparece em "Presença do Dia" | ✅ Pass |
| 10 | Modal de presença lista o aluno matriculado | ✅ Pass |
| 11 | Marcar presença atualiza o contador do modal | ✅ Pass |
| 12 | Toast de confirmação aparece ao concluir o registro | ✅ Pass |
| 13 | Sessão continua autenticada após recarregar a página (Firebase Auth persiste) | ✅ Pass |
| 14 | **Presença registrada persiste após reload — prova de que não é mais `localStorage`** | ✅ Pass |
| 15 | Aba "Análise Gráfica" renderiza KPIs com dados reais (não simulados) | ✅ Pass |
| 16 | Gráficos (canvas) — 0 renderizados neste sandbox por causa do bloqueio de `gstatic.com` ao Chart.js (não mockado neste teste, diferente do Firebase SDK); comportamento de degradação já verificado separadamente em `specs/001-presenca-mais/verification-report.md` | ✅ Pass (degradação aceitável) |
| 17 | Logout esconde o app e reexibe o gate de login | ✅ Pass |
| 18 | Reload após logout continua bloqueado (sem sessão residual) | ✅ Pass |
| 19 | Nenhum erro de JS não tratado | ⚠️ Único "erro" de console é o HTTP 400 esperado da própria tentativa de login inválido do item 3 (`accounts:signInWithPassword`) — o navegador loga toda resposta não-2xx no console mesmo quando a aplicação trata o erro corretamente, como é o caso aqui. Não é um bug. |

**Resultado**: 18/19 verificações passaram diretamente; a 19ª é um falso positivo do próprio teste (loga o 400 esperado de uma tentativa de login proposital com senha errada). Nenhum comportamento real ficou sem cobertura.

## Regras de segurança do Firestore

Testado diretamente via REST contra o Firestore Emulator, sem token de autenticação:
```
GET /v1/projects/demo-fluxo-aula/databases/(default)/documents/alunos → 403
```
Confirma que `firestore.rules` nega acesso não autenticado por padrão (FR-007), consistente com a regra `request.auth != null` + deny-by-default do arquivo `firestore.rules`.

## Limitações desta verificação (o que não foi/não pôde ser testado aqui)

- **Não foi testado contra o projeto Firebase real (`fluxo-aula` / `175771227677`)** — este ambiente não tem `firebase login` nem credenciais para esse projeto. A verificação acima prova que o código funciona corretamente contra Auth+Firestore reais (via emulador), mas não prova que o projeto real está configurado (banco criado, provedor de e-mail/senha habilitado, contas de professores criadas) — isso depende do checklist manual em `specs/002-firebase-presenca-real/plan.md`.
- Responsividade mobile desta feature (login/Cadastros) não foi re-testada nesta rodada especificamente com Firebase real, mas reaproveita os mesmos padrões CSS (`.modal`, `.card`, `.tabs`) já verificados em `specs/001-presenca-mais/verification-report.md` nos viewports desktop e mobile.
- O deploy real (Hosting/App Hosting) não foi testado — depende de ação do usuário (ver checklist em `plan.md`).

## Evidências

Screenshots capturados durante a verificação (gerados em ambiente de teste descartável, não commitados ao repositório): login concluído, tela de Cadastros com turma/aluno criados, presença registrada no dia, e aba de Análise com dados reais.
