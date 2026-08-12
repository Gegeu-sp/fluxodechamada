import { db } from './firebase-config.js';
import { pad2 } from './utils.js';
import {
  collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc,
  query, where, serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

// ================== CACHE EM MEMÓRIA (turmas/alunos/setores) ==================
// Turmas, alunos e setores mudam pouco durante uma sessão de uso; carregamos
// uma vez e recarregamos só quando algo é criado/editado em Cadastros.
let turmasCache = null;
let alunosCache = null;
let setoresCache = null;

export async function listTurmas(force = false) {
  if (turmasCache && !force) return turmasCache;
  const snap = await getDocs(collection(db, 'turmas'));
  turmasCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  return turmasCache;
}

export async function listAlunos(force = false) {
  if (alunosCache && !force) return alunosCache;
  const snap = await getDocs(collection(db, 'alunos'));
  alunosCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  return alunosCache;
}

export async function listSetores(force = false) {
  if (setoresCache && !force) return setoresCache;
  const snap = await getDocs(collection(db, 'setores'));
  setoresCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  return setoresCache;
}

function invalidateCache() {
  turmasCache = null;
  alunosCache = null;
  setoresCache = null;
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

// ================== TURMAS ==================
export async function createTurma({ modalidade, horario, diasSemana, setor, capacidade }) {
  const ref = await addDoc(collection(db, 'turmas'), {
    modalidade, horario, diasSemana, setor, capacidade,
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

  const [turmas, alunos, setores] = await Promise.all([listTurmas(), listAlunos(), listSetores()]);
  const alunosMap = new Map(alunos.map(a => [a.id, a]));
  const setoresMap = new Map(setores.map(s => [s.id, s]));

  const doDia = turmas.filter(t => t.ativa !== false && (t.diasSemana || []).includes(dow));

  const aulas = await Promise.all(doDia.map(async turma => {
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
      capacity: turma.capacidade,
      students,
    };
  }));

  aulas.sort((a, b) => a.time.localeCompare(b.time));
  return aulas;
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
    atualizadoPor: uid,
    atualizadoEm: serverTimestamp(),
  });
}

// ================== PRESENÇAS EM UM PERÍODO (para Análise) ==================
export async function getPresencasEntre(dataInicio, dataFim, { modalidade = 'all', setor = 'all' } = {}) {
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
      (setor === 'all' || p.setor === setor));
}
