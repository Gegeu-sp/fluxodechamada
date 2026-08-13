import { db } from './firebase-config.js';
import { pad2 } from './utils.js';
import {
  collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc,
  query, where, serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

// ================== CACHE EM MEMÓRIA (turmas/alunos/setores/empresas) ==================
// Essas coleções mudam pouco durante uma sessão de uso; carregamos uma vez e
// recarregamos só quando algo é criado/editado em Cadastros. O cache guarda a
// *promessa* da busca, não o resultado: assim, chamadas simultâneas na
// inicialização (as três abas iniciam em paralelo) compartilham uma única
// requisição ao Firestore em vez de dispararem buscas duplicadas.
const listCache = {};

function listCollection(name, force) {
  if (!listCache[name] || force) {
    const p = getDocs(collection(db, name))
      .then(snap => snap.docs.map(d => ({ id: d.id, ...d.data() })));
    listCache[name] = p;
    // Erro não fica cacheado: a próxima chamada tenta de novo. Só limpa se a
    // entrada ainda for esta promessa — outra busca pode tê-la substituído.
    p.catch(() => { if (listCache[name] === p) delete listCache[name]; });
  }
  return listCache[name];
}

export const listTurmas = (force = false) => listCollection('turmas', force);
export const listAlunos = (force = false) => listCollection('alunos', force);
export const listSetores = (force = false) => listCollection('setores', force);
export const listEmpresas = (force = false) => listCollection('empresas', force);

function invalidateCache() {
  Object.keys(listCache).forEach(k => delete listCache[k]);
}

// ================== ALUNOS ==================
export async function createAluno({ nome }) {
  const ref = await addDoc(collection(db, 'alunos'), {
    nome, ativo: true, criadoEm: serverTimestamp(),
  });
  invalidateCache();
  return ref.id;
}

export async function updateAluno(id, data) {
  await updateDoc(doc(db, 'alunos', id), data);
  invalidateCache();
}

// ================== SETORES ==================
export async function createSetor({ nome }) {
  const ref = await addDoc(collection(db, 'setores'), {
    nome, ativo: true, criadoEm: serverTimestamp(),
  });
  invalidateCache();
  return ref.id;
}

export async function updateSetor(id, data) {
  await updateDoc(doc(db, 'setores', id), data);
  invalidateCache();
}

// ================== EMPRESAS ==================
export async function createEmpresa({ nome }) {
  const ref = await addDoc(collection(db, 'empresas'), {
    nome, ativo: true, criadoEm: serverTimestamp(),
  });
  invalidateCache();
  return ref.id;
}

export async function updateEmpresa(id, data) {
  await updateDoc(doc(db, 'empresas', id), data);
  invalidateCache();
}

// ================== TURMAS ==================
export async function createTurma({ modalidade, horario, diasSemana, setor, empresa, capacidade }) {
  const ref = await addDoc(collection(db, 'turmas'), {
    modalidade, horario, diasSemana, setor, empresa, capacidade,
    alunoIds: [], ativa: true,
  });
  invalidateCache();
  return ref.id;
}

export async function updateTurma(id, data) {
  await updateDoc(doc(db, 'turmas', id), data);
  invalidateCache();
}

export async function matricular(turmaId, alunoIds) {
  await updateDoc(doc(db, 'turmas', turmaId), { alunoIds });
  invalidateCache();
}

// ================== CHECK-IN (3 estados) ==================
// Aluno sem entrada no mapa de checkin é sempre tratado como 'faltou' —
// nunca fica ambíguo. Qualquer status diferente de 'faltou' conta como
// presença nas estatísticas e na análise gráfica.
export const isAtendido = status => status !== 'faltou';
export const countAtendidos = (checkin = {}) => Object.values(checkin).filter(isAtendido).length;

// ================== AULAS DO DIA (deriva de turmas + presenças) ==================
// Produz o mesmo formato que o antigo getDay() simulado gerava, para que as
// funções de renderização (renderDashboard/openModal/renderStudents) não
// precisem mudar de formato de dado, só a origem.
export async function getAulasDoDia(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dow = new Date(y, m - 1, d).getDay();

  // Setores/empresas são decorativos aqui (só resolvem nomes) — se a leitura
  // deles falhar (ex.: regras do Firestore desatualizadas no projeto real),
  // as aulas do dia ainda renderizam, com o id bruto/'—' no lugar do nome.
  const [turmas, alunos, setores, empresas] = await Promise.all([
    listTurmas(),
    listAlunos(),
    listSetores().catch(e => { console.error('Setores indisponíveis:', e); return []; }),
    listEmpresas().catch(e => { console.error('Empresas indisponíveis:', e); return []; }),
  ]);
  const alunosMap = new Map(alunos.map(a => [a.id, a]));
  const setoresMap = new Map(setores.map(s => [s.id, s]));
  const empresasMap = new Map(empresas.map(e => [e.id, e]));

  // Turmas com formato inválido/incompleto (ex.: criadas manualmente no Console
  // antes deste schema existir) não podem derrubar a aula do dia inteiro — cada
  // uma é resolvida isoladamente, e a que falhar vira null e é descartada.
  const doDia = turmas.filter(t =>
    t.ativa !== false &&
    typeof t.horario === 'string' &&
    Array.isArray(t.diasSemana) &&
    t.diasSemana.includes(dow));

  const aulas = await Promise.all(doDia.map(async turma => {
    try {
      const presencaId = `${turma.id}_${dateStr}`;
      const presencaSnap = await getDoc(doc(db, 'presencas', presencaId));
      const checkin = presencaSnap.exists() ? (presencaSnap.data().checkin || {}) : {};

      const students = (turma.alunoIds || [])
        .map(id => alunosMap.get(id))
        .filter(Boolean)
        .map(a => ({ id: a.id, name: a.nome, status: checkin[a.id] || 'faltou' }));

      return {
        id: turma.id,
        turmaId: turma.id,
        date: dateStr,
        time: turma.horario,
        mod: turma.modalidade,
        sector: turma.setor,
        sectorName: (setoresMap.get(turma.setor) || {}).nome || turma.setor,
        empresa: turma.empresa,
        empresaName: (empresasMap.get(turma.empresa) || {}).nome || turma.empresa || '—',
        capacity: turma.capacidade || 0,
        students,
      };
    } catch (e) {
      console.error(`Falha ao carregar a turma ${turma.id} em ${dateStr}:`, e);
      return null;
    }
  }));

  const validAulas = aulas.filter(Boolean);
  validAulas.sort((a, b) => a.time.localeCompare(b.time));
  return validAulas;
}

// ================== AULAS DA SEMANA (agenda) ==================
// Reaproveita getAulasDoDia por dia — sem duplicar a lógica de derivação de
// aulas. Semana vai de domingo (0) a sábado (6), mesma convenção já usada em
// diasSemana/WEEKDAYS_PT.
export async function getAulasDaSemana(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const base = new Date(y, m - 1, d);
  const dow = base.getDay();
  const domingo = new Date(base);
  domingo.setDate(base.getDate() - dow);

  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const dt = new Date(domingo);
    dt.setDate(domingo.getDate() + i);
    return `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}`;
  });

  const results = await Promise.all(weekDates.map(getAulasDoDia));
  return weekDates.map((date, i) => ({ date, dow: i, aulas: results[i] }));
}

export async function savePresenca(turmaId, dateStr, checkin, uid) {
  const turmas = await listTurmas();
  const turma = turmas.find(t => t.id === turmaId);
  const presencaId = `${turmaId}_${dateStr}`;
  await setDoc(doc(db, 'presencas', presencaId), {
    turmaId, data: dateStr, checkin,
    modalidade: turma ? turma.modalidade : null,
    setor: turma ? turma.setor : null,
    empresa: turma ? turma.empresa : null,
    atualizadoPor: uid,
    atualizadoEm: serverTimestamp(),
  });
}

// ================== PRESENÇAS EM UM PERÍODO (para Análise) ==================
export async function getPresencasEntre(dataInicio, dataFim, { modalidade = 'all', setor = 'all', empresa = 'all' } = {}) {
  const q = query(
    collection(db, 'presencas'),
    where('data', '>=', dataInicio),
    where('data', '<=', dataFim),
  );
  const snap = await getDocs(q);
  return snap.docs
    .map(d => d.data())
    .filter(p =>
      (modalidade === 'all' || p.modalidade === modalidade) &&
      (setor === 'all' || p.setor === setor) &&
      (empresa === 'all' || p.empresa === empresa));
}
