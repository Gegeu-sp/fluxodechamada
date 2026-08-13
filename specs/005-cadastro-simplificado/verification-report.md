# Verification Report — Cadastro Menos Fragmentado (005)

**Data**: 2026-08-13
**Método**: Automação de navegador real (Playwright + Chromium) contra o **Firebase Local Emulator Suite** — mesma receita das specs 002/003/004 (SDK do Firebase servido localmente via pacote npm, pois `www.gstatic.com` é bloqueado neste sandbox).
**Viewports**: Desktop 1280×900 · Mobile 390×844.

## Resumo

**16/16 verificações da feature 005 passaram.** As três suites anteriores foram re-executadas e continuam passando: **003 → 28/28**, **004 (empresa) → 19/19**, **defensiva (turma malformada) → 12/12**.

## Resultados — Desktop

| # | Verificação | Resultado |
|---|---|---|
| U1 | Cadastros tem exatamente 3 sub-abas (Alunos, Turmas, Empresas e setores) | ✅ Pass |
| U2 | Empresas e setores aparecem juntos no mesmo painel | ✅ Pass |
| U3 | Modal de empresa abre **por cima** do formulário da turma, que continua aberto (comparação real de `z-index`, não só visibilidade) | ✅ Pass |
| U4 | Empresa recém-criada volta já selecionada no formulário | ✅ Pass |
| U5 | Setor recém-criado volta já selecionado no formulário | ✅ Pass |
| U6 | Horário e capacidade preenchidos antes não se perdem (14:30 / 17 intactos) | ✅ Pass |
| U7 | Formulário da turma permanece aberto durante todo o fluxo | ✅ Pass |
| U8 | Matrícula abre sozinha depois de criar a turma | ✅ Pass |
| U9 | Turma criada mostra a empresa e o setor cadastrados inline | ✅ Pass |
| U10 | Turma fica com 1 matriculado | ✅ Pass |
| U11 | Editar turma pré-seleciona empresa e setor corretos | ✅ Pass |
| U12 | Nenhum erro de JS não tratado | ✅ Pass |

## Resultados — Mobile (390×844, touch)

| # | Verificação | Resultado |
|---|---|---|
| M1 | Painel "Empresas e setores" sem scroll horizontal | ✅ Pass |
| M2 | Botão "+ Nova" ao lado do campo Empresa visível e alcançável | ✅ Pass |
| M3 | Formulário da turma sem scroll horizontal | ✅ Pass |
| M4 | Nenhum erro de JS não tratado | ✅ Pass |

## Nota sobre os scripts das suites anteriores

As suites 003, 004 e defensiva precisaram de ajuste **nos scripts**, não no app: passaram a usar a sub-aba `organizacao` (as abas `setores`/`empresas` deixaram de existir separadamente) e a lidar com a matrícula que agora abre sozinha após criar turma. São mudanças de comportamento pedidas por esta spec, não regressões.

Aproveitando, três verificações que usavam `waitForTimeout` fixo depois de salvar um cadastro passaram a esperar a linha aparecer de fato. Elas haviam falhado de forma intermitente em rodadas com o emulador frio (a primeira escrita demora mais que o sleep chutado) — falha do teste, não do app: as checagens seguintes, que dependiam do mesmo dado, passavam normalmente na mesma rodada.

## Conclusão

O fluxo de cadastro de turma deixou de ter beco sem saída: dá para criar uma turma completa — incluindo empresa e setor que não existiam, mais a matrícula dos alunos — sem sair da aba Turmas em momento nenhum. As sub-abas caíram de 4 para 3 sem remover nenhuma funcionalidade, e a diferença entre empresa e setor passou a estar explicada no ponto onde a dúvida aparece.

## Limitações

- Verificação contra o Firebase Local Emulator Suite, não contra o projeto real `fluxo-aula` (sem credenciais de Firestore neste ambiente).
- Esta feature não altera coleções, campos nem regras de segurança — nada a republicar no Console.
