# Verification Report — Empresa Cadastrável, Separada de Setor (004)

**Data**: 2026-08-12
**Método**: Automação de navegador real (Playwright + Chromium) contra o **Firebase Local Emulator Suite** (`fluxo-aula`) — não contra o projeto real, mesma limitação/receita das specs 002/003 (SDK do Firebase servido localmente via pacote `firebase@10.12.2` obtido do npm, pois `www.gstatic.com` é bloqueado neste sandbox).
**Viewports**: Desktop 1280×900 · Mobile 390×844.

## Resumo

**19/19 verificações da feature 004 passaram.** Nenhum bug real encontrado nesta feature. Suite completa de regressão da feature 003 (**28/28**) foi re-executada depois destas mudanças e continua passando — o único ajuste necessário foi no próprio script de teste (que precisou passar a selecionar uma Empresa ao criar turma, já que o campo passou a ser obrigatório no formulário — comportamento novo esperado, não um bug).

## Resultados — Desktop

| # | Verificação | Resultado |
|---|---|---|
| D1 | Login funciona | ✅ Pass |
| D2 | Empresa criada aparece na lista de Cadastros | ✅ Pass |
| D3 | Dois setores criados (Financeiro, Comercial) | ✅ Pass |
| D4 | Aluno criado | ✅ Pass |
| D5 | Select de Empresa na turma é dinâmico e independente do de Setor | ✅ Pass |
| D6 | Turma 1 (Empresa X + Setor Financeiro) mostra os dois nomes, não ids brutos | ✅ Pass |
| D7 | Turma 2 (mesma Empresa X + Setor Comercial) criada sem restrição cruzada | ✅ Pass |
| D8–D9 | Chips de Empresa e de Setor aparecem lado a lado, dinâmicos e independentes em Presença do Dia | ✅ Pass (2/2) |
| D10 | Ambas as turmas da empresa aparecem sem filtro | ✅ Pass |
| D11 | Filtrar por Setor "Financeiro" retorna só 1 turma, independente da empresa | ✅ Pass |
| D12 | Filtrar por Empresa retorna as 2 turmas dela (setores diferentes) | ✅ Pass |
| D13 | Modal de presença mostra Empresa e Setor no subtítulo | ✅ Pass |
| D14 | Agenda semanal mostra o nome da Empresa nos itens | ✅ Pass |
| D15 | Chip de Empresa dinâmico em Análise Gráfica | ✅ Pass |
| D16 | Nenhum erro de JS não tratado (desktop) | ✅ Pass |

## Resultados — Mobile (390×844, touch)

| # | Verificação | Resultado |
|---|---|---|
| M1 | Sem scroll horizontal com os novos chips de Empresa (toolbar com `flex-wrap` já existente absorveu a linha extra) | ✅ Pass |
| M2 | Modal de presença no mobile mostra Empresa no subtítulo | ✅ Pass |
| M3 | Nenhum erro de JS não tratado (mobile) | ✅ Pass |

## Regressão — feature 003 (setores, agenda semanal, check-in 3 estados)

Re-executada por completo depois das mudanças desta feature: **28/28 passaram**, confirmando que adicionar Empresa não quebrou nada do que já funcionava (setores, agenda semanal, check-in de 3 estados, análise gráfica).

## Conclusão

Empresa e Setor funcionam como dois campos genuinamente independentes: a mesma empresa pode ter turmas em setores diferentes, o mesmo setor pode ter turmas de empresas diferentes, e os filtros de "Presença do Dia"/"Análise Gráfica" respeitam essa independência (E lógico entre os dois). Toda tela que já mostrava Setor (cards do dia, agenda semanal, modal de presença, cartões de Cadastros) agora mostra Empresa também, sem quebrar em nenhum dos dois viewports testados.

## Addendum — "não está entrando o login" após o deploy desta feature

Logo após o deploy desta feature, o usuário reportou que o login parou de funcionar no site publicado. **Causa raiz reproduzida no emulador**, não hipótese: o código novo já lê a coleção `empresas`, mas as regras do Firestore no projeto real ainda eram as da feature 003, sem o bloco `match /empresas/{id}`. Como o catch-all final nega tudo que não está listado, `listEmpresas()` tomava `FirebaseError: false for 'list'`.

Isso derrubava a inicialização inteira pós-login: `main.js` usava `Promise.all` nas três abas, então a rejeição de uma abortava as outras duas. O resultado visível era exatamente "o login não entra" — a autenticação de fato acontecia (`body.authed` era aplicado, o gate sumia), mas nenhuma tela renderizava atrás dele, então na prática parecia que o login não passou.

**Reprodução** (`repro-login-old-rules.js`, código atual + regras da 003 no emulador), antes das correções:

```
authed: true, loginVisible: false, classCards: 0, classListHTML: ""
pageerror: FirebaseError: false for 'list' @ L51
```

Ou seja: autenticado, gate fechado, tela vazia — o sintoma relatado, confirmado.

**Correções aplicadas** (resiliência a falha parcial, além de republicar as regras):

1. `js/main.js`: `Promise.allSettled` no lugar de `Promise.all` ao inicializar as três abas — uma aba que falhe ao carregar dados não derruba as outras duas; cada falha vira um erro visível na tela.
2. `js/data.js`: em `getAulasDoDia`, `setores`/`empresas` são tratados como decorativos (só resolvem nomes) — se a leitura falhar, as aulas do dia ainda renderizam, com o id bruto/`—` no lugar do nome.
3. `js/ui-cadastros.js`: `refreshCadastros` usa `allSettled` e avisa exatamente qual coleção falhou ("Não foi possível carregar: empresas — confira as regras do banco"), em vez de deixar a aba em branco.
4. `js/ui-presenca.js` / `js/ui-analise.js`: falha ao montar os chips de filtro não impede a grade de aulas nem os KPIs/gráficos de renderizarem.

**Mesma reprodução, depois das correções** — o app degrada em vez de quebrar:

```
authed: true, classListHTML: "<div class=\"empty\">…Nenhuma aula encontrada…"
toast: "Não foi possível carregar: empresas — confira as regras do banco"
```

Login entra, a aba renderiza, e o aviso diz exatamente o que fazer.

### Ganho de performance junto

`js/data.js` passou a cachear a **promessa** da busca, não só o resultado. As três abas inicializam em paralelo e várias chamam `listTurmas`/`listAlunos`/`listSetores`/`listEmpresas` ao mesmo tempo; antes, como o cache só era preenchido *depois* da resposta chegar, as chamadas simultâneas disparavam buscas duplicadas da mesma coleção. Agora a primeira chamada registra a promessa e as demais aguardam a mesma requisição — menos idas ao Firestore no carregamento inicial, que é justamente o momento mais lento do app. Erros não ficam cacheados: a próxima chamada tenta de novo.

## Limitações

- Verificação contra o Firebase Local Emulator Suite, não contra o projeto real `fluxo-aula` (sem credenciais neste ambiente).
- **Republicar `firestore.rules` no Console continua obrigatório** (novo bloco `empresas` + `turmas` agora exige `empresa is string`). As correções acima fazem o app degradar com um aviso claro em vez de quebrar, mas o cadastro de empresas só funciona de fato com as regras novas publicadas.
- Como já recomendado na feature 003, reabrir/salvar de novo as turmas de teste existentes escolhendo também uma empresa.
