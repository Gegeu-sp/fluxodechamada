# Verification Report — Setores, Agenda Semanal e Check-in de 3 Estados (003)

**Data**: 2026-08-12
**Método**: Automação de navegador real (Playwright + Chromium) contra o **Firebase Local Emulator Suite** (`demo-fluxo-aula`) — não contra o projeto real `fluxo-aula` (mesma limitação/receita de `specs/002-firebase-presenca-real/verification-report.md`: SDK do Firebase servido localmente via pacote `firebase@10.12.2` obtido do npm, pois `www.gstatic.com` é bloqueado neste sandbox).
**Viewports**: Desktop 1280×900 · Mobile 390×844.

## Resumo

**28/28 verificações passaram** na rodada final. Duas falhas reais de responsividade mobile foram encontradas e corrigidas durante o processo — ver seção abaixo.

## Bugs reais encontrados e corrigidos

1. **Menu principal de abas transbordava no mobile (pré-existente, achado agora).** As 3 abas (Presença/Análise/Cadastros) já não cabiam em 390px de largura — `.tabs` não tinha `flex-wrap` nem scroll próprio, causando scroll horizontal da página inteira. **Corrigido**: em telas ≤520px, `.tabs` passa a rolar horizontalmente dentro de si mesma (`overflow-x:auto`), mantendo o visual de pílula sem quebrar o layout da página.
2. **Linha do aluno no modal de presença transbordava no mobile.** Ao trocar o switch binário por 3 botões de texto (Faltou/Não fez/Fez), o grupo de botões ficou largo demais para quebrar linha corretamente — um caso clássico de flexbox onde um item sem `min-width:0` força o contêiner pai a crescer além do viewport em vez de encolher/quebrar. Isso também fazia o teste automatizado de toque no botão "Fez" falhar por timeout (o botão ficava fora da área visível). **Corrigido**: adicionado `min-width:0` em `.student-list`, `.s-name` e `.checkin-chips`, permitindo que a linha quebre corretamente em telas estreitas.

Ambos encontrados **porque a verificação testou de fato em viewport mobile com Playwright**, não apenas leitura de código — exatamente o propósito do Princípio V da constituição.

## Resultados — Desktop

| # | Verificação | Resultado |
|---|---|---|
| D1–D3 | Login, criação de setor e criação de aluno | ✅ Pass |
| D4–D5 | Seletor de setor na turma é dinâmico (sem A/B/C); turma exibe nome do setor | ✅ Pass |
| D6 | Matrícula de aluno na turma | ✅ Pass |
| D7 | Chip de setor dinâmico em "Presença do Dia" | ✅ Pass |
| D8 | Turma cadastrada aparece na Presença do Dia | ✅ Pass |
| D9–D14 | Check-in de 3 estados: padrão "Faltou", troca de estado, contador reflete corretamente, persistência após reload do modal, botões "Todos fizeram"/"Todos faltaram" | ✅ Pass (6/6) |
| D15–D20 | Visão semanal: grade aparece, turma multi-dia aparece 1x por dia configurado, clique abre o modal certo, cada ocorrência persiste presença de forma independente, volta pra visão Dia | ✅ Pass (6/6) |
| D21–D22 | Chip de setor dinâmico e KPIs corretos em Análise Gráfica | ✅ Pass |
| D23 | Nenhum erro de JS não tratado | ✅ Pass |

## Resultados — Mobile (390×844, touch)

| # | Verificação | Resultado |
|---|---|---|
| M1 | Grade semanal vira 1 coluna | ✅ Pass |
| M2 | Sem scroll horizontal na visão semanal (após correção) | ✅ Pass |
| M3–M4 | Chips de check-in visíveis e funcionam por toque (após correção) | ✅ Pass |
| M5 | Nenhum erro de JS não tratado | ✅ Pass |

## Conclusão

As três funcionalidades pedidas (setores cadastráveis, agenda semanal dentro de "Presença do Dia", check-in de presença com 3 estados) foram implementadas e verificadas de fato em navegador, em desktop e mobile, incluindo o caso de uma turma recorrendo em múltiplos dias da semana com presença independente por dia. Dois bugs de responsividade mobile foram encontrados e corrigidos durante a verificação.

## Limitações

- Verificação contra o Firebase Local Emulator Suite, não contra o projeto real `fluxo-aula` (sem credenciais neste ambiente).
- Antes do deploy real: seguir o checklist de `specs/003-setores-agenda-checkin/plan.md` (deploy das novas regras, limpeza manual de presenças/turmas de teste antigas incompatíveis com o novo formato).

## Addendum — bug real em produção após o primeiro deploy desta feature

Depois do primeiro deploy real desta feature, o usuário reportou que no site publicado (`fluxo-aula.web.app`) a visão "Semana" aparecia em branco e o check-in não aparecia ao lado do nome do aluno — mesmo após um redeploy com headers de cache corrigidos e reteste em aba anônima (o que descartou cache do navegador/CDN como causa).

**Causa raiz identificada por inspeção de código**: `getAulasDoDia()` (`js/data.js`) montava a lista de aulas do dia com um único `Promise.all` sem isolamento por turma, e ordenava o resultado com `aulas.sort((a, b) => a.time.localeCompare(b.time))`. Qualquer turma com `horario` ausente/indefinido (ex.: um documento criado manualmente no Console do Firebase durante os testes iniciais do projeto, antes deste schema existir, sem passar pelo `createTurma()` do app) fazia `a.time.localeCompare` lançar `TypeError` sobre `undefined`. Como essa função é reaproveitada tanto pela visão "Dia" quanto pela "Semana" (que a chama 7 vezes), e a rejeição não era tratada em lugar nenhum (nem em `renderDashboard()`, nem no `Promise.all` de `main.js` que inicializa as três abas em paralelo), o erro virava uma **rejeição de Promise não tratada silenciosa**: sem stack trace visível, sem mensagem na tela — exatamente o sintoma relatado ("não trava, não dá erro, só não aparece nada"). Isso não foi pego pela verificação original porque o emulador é sempre populado do zero por dados criados através do próprio app (sempre com o schema correto); dados reais acumulados de testes manuais anteriores no projeto real podem não seguir o schema.

**Correções aplicadas** (`js/data.js`, `js/main.js`):
1. `getAulasDoDia` agora filtra turmas com `horario` que não seja string ou `diasSemana` que não seja array antes de processá-las (turma malformada é ignorada, não derruba as demais).
2. Cada turma é resolvida dentro de um `try/catch` isolado — uma falha inesperada em uma turma vira `null` (descartada), não interrompe as outras.
3. `main.js` ganhou um handler global (`window.onerror` / `window.onunhandledrejection`) que mostra um toast com a mensagem real do erro — rede de segurança para qualquer falha futura não intencional aparecer na tela em vez de silenciosamente não renderizar nada (crítico porque o uso é majoritariamente mobile, sem acesso a DevTools).

**Nova verificação** (script descartável `verify-004-defensive.js`, mesma receita de infraestrutura desta spec): turma boa criada via UI + turma malformada (sem `horario`, `diasSemana` como string) injetada diretamente no Firestore emulator via REST (`Authorization: Bearer owner`), simulando dado legado fora do schema. **12/12 passaram**: a turma boa continua aparecendo normalmente em "Dia" e "Semana", o check-in continua aparecendo ao lado do nome, e nenhum erro de JS não tratado ocorre. Suite completa de regressão (28/28 desta spec) re-executada e continua passando.

**Ainda não confirmável por este ambiente**: se o dado legado do projeto real (`fluxo-aula`) tinha de fato esse formato exato (turma sem `horario`), essa era só a hipótese mais provável dado o histórico da sessão (turmas criadas manualmente pelo Console antes deste schema). O fix, porém, é defensivo por natureza — resolve essa classe de problema independente da causa exata, e a rede de erro visível garante diagnóstico direto (print de tela) caso o problema persista por outro motivo.
