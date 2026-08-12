import { db } from './firebase-config.js';
import {
  collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc,
  query, where, serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

// ================== CACHE EM MEMÓRIA (turmas/alunos) ==================
// Turmas e alunos mudam pouco durante uma sessão de uso; carregamos uma vez
// e recarregamos só quando algo é criado/editado em Cadastros.
let turmasCache = null;
let alunosCache = null;

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

function invalidateCache() {
  turmasCache = null;
  alunosCache = null;
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

// ================== AULAS DO DIA (deriva de turmas + presenças) ==================
// Produz o mesmo formato que o antigo getDay() simulado gerava, para que as
// funções de renderização (renderDashboard/openModal/renderStudents) não
// precisem mudar de formato de dado, só a origem.
export async function getAulasDoDia(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dow = new Date(y, m - 1, d).getDay();

  const [turmas, alunos] = await Promise.all([listTurmas(), listAlunos()]);
  const alunosMap = new Map(alunos.map(a => [a.id, a]));

  const doDia = turmas.filter(t => t.ativa !== false && (t.diasSemana || []).includes(dow));

  const aulas = await Promise.all(doDia.map(async turma => {
    const presencaId = `${turma.id}_${dateStr}`;
    const presencaSnap = await getDoc(doc(db, 'presencas', presencaId));
    const presentesSet = presencaSnap.exists() ? new Set(presencaSnap.data().presentes || []) : new Set();

    const students = (turma.alunoIds || [])
      .map(id => alunosMap.get(id))
      .filter(Boolean)
      .map(a => ({ id: a.id, name: a.nome, present: presentesSet.has(a.id) }));

    return {
      id: turma.id,
      turmaId: turma.id,
      date: dateStr,
      time: turma.horario,
      mod: turma.modalidade,
      sector: turma.setor,
      capacity: turma.capacidade,
      students,
    };
  }));

  aulas.sort((a, b) => a.time.localeCompare(b.time));
  return aulas;
}

export async function savePresenca(turmaId, dateStr, presentIds, uid) {
  const turmas = await listTurmas();
  const turma = turmas.find(t => t.id === turmaId);
  const presencaId = `${turmaId}_${dateStr}`;
  await setDoc(doc(db, 'presencas', presencaId), {
    turmaId, data: dateStr, presentes: presentIds,
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
