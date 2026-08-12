<div align="center">

# Fluxo-Aula

### Presença+ — controle de presença inteligente para estúdios e academias

[![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat-square&logo=html5&logoColor=white)](#tecnologias)
[![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat-square&logo=css3&logoColor=white)](#tecnologias)
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=black)](#tecnologias)
[![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=flat-square&logo=firebase&logoColor=black)](#tecnologias)
[![Firestore](https://img.shields.io/badge/Cloud%20Firestore-039BE5?style=flat-square&logo=firebase&logoColor=white)](#tecnologias)
[![Status](https://img.shields.io/badge/status-em%20desenvolvimento-blue?style=flat-square)](#roadmap)
[![Licença](https://img.shields.io/badge/licença-todos%20os%20direitos%20reservados-lightgrey?style=flat-square)](#licença)

</div>

---

## Sobre o projeto

**Fluxo-Aula** é uma plataforma web para estúdios e academias controlarem, em tempo real, a presença dos alunos em suas turmas — substituindo planilhas e cadernos de chamada por um fluxo digital simples, rápido e auditável.

Professores registram a presença de cada aula em segundos; gestores acompanham indicadores de ocupação, frequência e engajamento por modalidade, setor e período, com dados reais armazenados em nuvem — não estimativas.

O produto nasceu com o "Presença+", um protótipo de alta fidelidade validado com o usuário final, e evoluiu para uma aplicação com autenticação, banco de dados e regras de segurança em produção.

## Sumário

- [Funcionalidades](#funcionalidades)
- [Tecnologias](#tecnologias)
- [Estrutura do projeto](#estrutura-do-projeto)
- [Como rodar localmente](#como-rodar-localmente)
- [Configuração do Firebase](#configuração-do-firebase)
- [Deploy](#deploy)
- [Modelo de dados](#modelo-de-dados-firestore)
- [Roadmap](#roadmap)
- [Autor](#autor)
- [Licença](#licença)

## Funcionalidades

| | |
|---|---|
| 🔐 **Acesso controlado** | Login por conta autorizada (e-mail/senha); sem autocadastro público — contas são provisionadas pela administração. |
| 🗂️ **Cadastro de turmas** | Modalidade, horário, dias da semana, setor e capacidade de cada turma recorrente. |
| 🧑‍🤝‍🧑 **Cadastro e matrícula de alunos** | Vínculo de alunos às turmas em que participam, com histórico preservado mesmo após desativação. |
| ✅ **Presença do dia** | Turmas do dia filtráveis por data, modalidade e setor, com registro de presença individual em poucos toques. |
| 📊 **Análise gráfica** | Indicadores e gráficos de presença diária, comparativo anual e ocupação por modalidade, com dados reais. |
| 📱 **Responsivo** | Interface adaptada para desktop, tablet e celular. |

## Tecnologias

| Camada | Tecnologia |
|---|---|
| Front-end | HTML5, CSS3 e JavaScript (ES Modules nativos) — sem framework, sem etapa de build |
| Autenticação | Firebase Authentication (e-mail/senha) |
| Banco de dados | Cloud Firestore |
| Hospedagem | Firebase Hosting |
| Visualização de dados | Chart.js |

## Estrutura do projeto

```
.
├── index.html                        # Estrutura HTML e estilos da aplicação
├── firebase.json                     # Configuração de Hosting e Firestore
├── .firebaserc                       # Alias do projeto Firebase
├── firestore.rules                   # Regras de segurança do banco de dados
├── firestore.indexes.json            # Índices do Firestore
└── js/
    ├── main.js                       # Ponto de entrada: inicializa autenticação e telas
    ├── firebase-config.example.js    # Modelo de configuração do Firebase (versionado)
    ├── firebase-config.js            # Configuração real do Firebase (local, fora do controle de versão)
    ├── auth.js                       # Login, logout e observação do estado de sessão
    ├── data.js                       # Acesso ao Firestore (turmas, alunos, presenças)
    ├── ui-presenca.js                # Tela de presença do dia
    ├── ui-analise.js                 # Tela de análise gráfica
    ├── ui-cadastros.js               # Tela de cadastro de turmas e alunos
    ├── constants.js                  # Modalidades, cores e demais constantes
    └── utils.js                      # Funções utilitárias compartilhadas
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
5. Em **Configurações do projeto → Seus apps**, adicione um app Web e copie os valores de configuração.
6. Duplique `js/firebase-config.example.js` como `js/firebase-config.js` e preencha com os valores reais:

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

   > `js/firebase-config.js` está no `.gitignore` e não é versionado — cada ambiente (local ou de outro colaborador) mantém sua própria cópia.

7. Verifique se o ID do projeto em `.firebaserc` corresponde ao ID real do seu projeto Firebase.

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

## Roadmap

- [x] Autenticação e controle de acesso
- [x] Cadastro de turmas e alunos
- [x] Registro de presença com persistência em nuvem
- [x] Análise gráfica com dados reais
- [ ] Provisionamento do ambiente de produção (contas, banco e deploy finais)
- [ ] Exportação de relatórios de presença

## Autor

**Argeu Rodrigues**
Estudante de Análise e Desenvolvimento de Sistemas (ADS) — 4º semestre — Universidade Anhembi Morumbi
GitHub: [@Gegeu-sp](https://github.com/Gegeu-sp)

## Licença

Todos os direitos reservados. Uso, cópia ou distribuição deste projeto sem autorização do autor não são permitidos.
