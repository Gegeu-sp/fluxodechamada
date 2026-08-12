# Fluxo-Aula · Presença+

Dashboard de controle de presença para aulas de estúdio/academia (Yoga, Laboral, Pilates, Dança e Funcional), com cadastro de turmas e alunos, registro diário de presença e análise gráfica dos dados — tudo com persistência real em nuvem.

## Funcionalidades

- **Login por conta autorizada** — acesso restrito a contas criadas previamente, sem autocadastro público.
- **Cadastro de turmas** — modalidade, horário, dias da semana, setor e capacidade.
- **Cadastro e matrícula de alunos** — vínculo de alunos às turmas em que participam.
- **Presença do dia** — visualização das turmas do dia, com filtros por data, modalidade e setor, e registro de presença por aluno.
- **Análise gráfica** — indicadores (KPIs) e gráficos de presenças diárias, comparativo anual e ocupação por modalidade.
- **Layout responsivo** — adaptado para desktop, tablet e celular.

## Tecnologias

- **HTML, CSS e JavaScript puro**, com módulos ES nativos (`import`/`export`) — sem framework e sem etapa de build.
- **Firebase Authentication** — autenticação por e-mail e senha.
- **Cloud Firestore** — banco de dados em nuvem para turmas, alunos e presenças.
- **Firebase Hosting** — hospedagem do site.
- **Chart.js** — geração dos gráficos da aba de análise.

## Estrutura do projeto

```
.
├── index.html                 # Estrutura HTML e estilos da aplicação
├── firebase.json              # Configuração de Hosting e Firestore
├── .firebaserc                # Alias do projeto Firebase
├── firestore.rules            # Regras de segurança do banco de dados
├── firestore.indexes.json     # Índices do Firestore
└── js/
    ├── main.js                # Ponto de entrada: inicializa autenticação e telas
    ├── firebase-config.js     # Configuração e inicialização do Firebase
    ├── auth.js                # Login, logout e observação do estado de sessão
    ├── data.js                # Acesso ao Firestore (turmas, alunos, presenças)
    ├── ui-presenca.js         # Tela de presença do dia
    ├── ui-analise.js          # Tela de análise gráfica
    ├── ui-cadastros.js        # Tela de cadastro de turmas e alunos
    ├── constants.js           # Modalidades, cores e demais constantes
    └── utils.js                # Funções utilitárias compartilhadas
```

## Como rodar localmente

O projeto não precisa de build nem de instalação de dependências — basta servir os arquivos estáticos:

```bash
npx serve .
# ou
python3 -m http.server
```

Antes de abrir a aplicação, configure o Firebase conforme a seção abaixo.

## Configuração do Firebase

1. Crie um projeto no [Console do Firebase](https://console.firebase.google.com).
2. Em **Authentication → Sign-in method**, habilite o provedor **E-mail/senha**.
3. Em **Authentication → Users**, crie manualmente as contas que terão acesso ao sistema.
4. Em **Firestore Database**, crie o banco de dados (modo produção).
5. Em **Configurações do projeto → Seus apps**, adicione um app Web e copie os valores de configuração para `js/firebase-config.js`:

```js
const firebaseConfig = {
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "...",
};
```

6. Verifique se o ID do projeto em `.firebaserc` corresponde ao ID real do seu projeto Firebase.

## Deploy

```bash
npm install -g firebase-tools
firebase login
firebase deploy --only firestore:rules
firebase deploy --only hosting
```

## Modelo de dados (Firestore)

| Coleção | Descrição | Principais campos |
|---|---|---|
| `alunos` | Alunos cadastrados | `nome`, `ativo`, `criadoEm` |
| `turmas` | Turmas/aulas recorrentes | `modalidade`, `horario`, `diasSemana`, `setor`, `capacidade`, `alunoIds`, `ativa` |
| `presencas` | Registro de presença por turma e data | `turmaId`, `data`, `presentes`, `modalidade`, `setor`, `atualizadoPor`, `atualizadoEm` |

O acesso a todas as coleções exige autenticação, conforme definido em `firestore.rules`.

## Autor

**Argeu Rodrigues**
Estudante de Análise e Desenvolvimento de Sistemas (ADS) — 4º semestre — Universidade Anhembi Morumbi
GitHub: [@Gegeu-sp](https://github.com/Gegeu-sp)

## Licença

Todos os direitos reservados. Uso, cópia ou distribuição deste projeto sem autorização do autor não são permitidos.
