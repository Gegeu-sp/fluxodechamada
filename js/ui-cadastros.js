import { $, initials, toast } from './utils.js';
import { MODS, MOD_KEYS, AV_COLORS, WEEKDAYS_PT } from './constants.js';
import {
  listAlunos, listTurmas, listSetores, listEmpresas, createAluno, updateAluno,
  createTurma, updateTurma, matricular, createSetor, updateSetor, createEmpresa, updateEmpresa,
} from './data.js';

let alunosCache = [];
let turmasCache = [];
let setoresCache = [];
let empresasCache = [];
let editingAlunoId = null;
let editingTurmaId = null;
let editingSetorId = null;
let editingEmpresaId = null;
let turmaDiasSelecionados = new Set();
let matriculaTurma = null;
let matriculaSelecionados = new Set();
// Quando empresa/setor é cadastrado de dentro do formulário de turma, guarda
// qual campo deve receber o item recém-criado já selecionado.
let inlineTarget = null;

export async function initCadastros() {
  wireSubTabs();
  wireAlunoModal();
  wireTurmaModal();
  wireSetorModal();
  wireEmpresaModal();
  wireMatriculaModal();
  $('alunoSearch').addEventListener('input', () => renderAlunosList());
  $('setorSearch').addEventListener('input', () => renderSetoresList());
  $('empresaSearch').addEventListener('input', () => renderEmpresasList());
  await refreshCadastros();
}

export async function refreshCadastros() {
  // allSettled: uma coleção ilegível (ex.: regras do Firestore desatualizadas)
  // não pode impedir as outras listas de renderizarem — o problema aparece
  // como um aviso claro, não como uma aba inteira em branco.
  const nomes = ['alunos', 'turmas', 'setores', 'empresas'];
  const results = await Promise.allSettled([listAlunos(true), listTurmas(true), listSetores(true), listEmpresas(true)]);
  [alunosCache, turmasCache, setoresCache, empresasCache] =
    results.map(r => r.status === 'fulfilled' ? r.value : []);
  const falhas = nomes.filter((_, i) => results[i].status === 'rejected');
  if (falhas.length) {
    results.forEach((r, i) => { if (r.status === 'rejected') console.error(`Falha ao carregar ${nomes[i]}:`, r.reason); });
    toast(`Não foi possível carregar: ${falhas.join(', ')} — confira as regras do banco`);
  }
  renderAlunosList();
  renderTurmasList();
  renderSetoresList();
  renderEmpresasList();
  // Preserva o que já estava escolhido: refreshCadastros pode rodar com o
  // formulário de turma aberto (ao cadastrar empresa/setor por ali mesmo),
  // e repopular os selects do zero apagaria a seleção em andamento.
  populateTurmaSetorSelect($('turmaSetor').value || null);
  populateTurmaEmpresaSelect($('turmaEmpresa').value || null);
}

function setorNome(id) { return (setoresCache.find(s => s.id === id) || {}).nome || id; }
function empresaNome(id) { return (empresasCache.find(e => e.id === id) || {}).nome || id || '—'; }

function wireSubTabs() {
  const panels = { alunos: 'cad-alunos', turmas: 'cad-turmas', organizacao: 'cad-organizacao' };
  document.querySelectorAll('#sec-cadastros .sub-tabs .tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#sec-cadastros .sub-tabs .tab').forEach(b => b.classList.toggle('active', b === btn));
      const sub = btn.dataset.subtab;
      Object.entries(panels).forEach(([key, id]) => { $(id).style.display = key === sub ? '' : 'none'; });
    });
  });
}

// ================== ALUNOS ==================
function renderAlunosList() {
  const q = ($('alunoSearch').value || '').toLowerCase().trim();
  const rows = alunosCache
    .filter(a => !q || a.nome.toLowerCase().includes(q))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

  $('alunosList').innerHTML = rows.length ? rows.map(a => {
    const col = AV_COLORS[Math.abs(hashCode(a.id)) % AV_COLORS.length];
    return `<div class="aluno-row" data-id="${a.id}">
      <span class="s-ava" style="background:${col}22;color:${col}">${initials(a.nome)}</span>
      <span class="s-name">${a.nome}</span>
      <span class="status-chip ${a.ativo ? 'status-on' : 'status-off'}">${a.ativo ? 'Ativo' : 'Inativo'}</span>
      <button class="btn ghost" data-edit="${a.id}">Editar</button>
    </div>`;
  }).join('') : `<div class="empty"><div class="big">🧑‍🤝‍🧑</div><h3>Nenhum aluno cadastrado</h3><p>Clique em "Novo aluno" para começar.</p></div>`;

  $('alunosList').querySelectorAll('[data-edit]').forEach(btn => {
    btn.addEventListener('click', () => openAlunoModal(alunosCache.find(a => a.id === btn.dataset.edit)));
  });
}

function hashCode(str) { let h = 0; for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0; return h; }

function wireAlunoModal() {
  $('btnNovoAluno').addEventListener('click', () => openAlunoModal(null));
  $('btnCloseAluno').addEventListener('click', closeAlunoModal);
  $('modalAluno').addEventListener('click', e => { if (e.target === $('modalAluno')) closeAlunoModal(); });
  $('alunoAtivoRow').addEventListener('click', () => $('alunoAtivoRow').classList.toggle('present'));
  $('alunoForm').addEventListener('submit', async e => {
    e.preventDefault();
    const nome = $('alunoNome').value.trim();
    if (!nome) return;
    if (editingAlunoId) {
      await updateAluno(editingAlunoId, { nome, ativo: $('alunoAtivoRow').classList.contains('present') });
      toast('Aluno atualizado');
    } else {
      await createAluno({ nome });
      toast('Aluno criado');
    }
    closeAlunoModal();
    await refreshCadastros();
  });
}

function openAlunoModal(aluno) {
  editingAlunoId = aluno ? aluno.id : null;
  $('alunoModalTitle').textContent = aluno ? 'Editar aluno' : 'Novo aluno';
  $('alunoNome').value = aluno ? aluno.nome : '';
  $('alunoAtivoWrap').style.display = aluno ? '' : 'none';
  $('alunoAtivoRow').classList.toggle('present', aluno ? aluno.ativo !== false : true);
  $('modalAluno').classList.add('show');
}
function closeAlunoModal() { $('modalAluno').classList.remove('show'); }

// ================== TURMAS ==================
function renderTurmasList() {
  const wrap = $('turmasList');
  if (!turmasCache.length) {
    wrap.innerHTML = `<div class="empty"><div class="big">🗂️</div><h3>Nenhuma turma cadastrada</h3><p>Clique em "Nova turma" para começar.</p></div>`;
    return;
  }
  wrap.innerHTML = turmasCache.map(t => {
    const m = MODS[t.modalidade] || { name: t.modalidade, emoji: '❓', soft: '#eee' };
    const diasChips = WEEKDAYS_PT.map((d, i) => `<span class="dia-chip ${(t.diasSemana || []).includes(i) ? 'on' : ''}">${d}</span>`).join('');
    return `<article class="card class-card" data-id="${t.id}">
      <div class="cc-top">
        <div class="mod-badge" style="background:${m.soft}">${m.emoji}</div>
        <div class="cc-info"><h4>${m.name}</h4><p>${empresaNome(t.empresa)} · Setor ${setorNome(t.setor)} · ${t.capacidade} vagas · ${(t.alunoIds || []).length} matriculados</p></div>
        <span class="time-chip">${t.horario}</span>
      </div>
      <div class="dias-row">${diasChips}</div>
      <div class="cc-foot">
        <span class="status-chip ${t.ativa !== false ? 'status-on' : 'status-off'}">${t.ativa !== false ? 'Ativa' : 'Inativa'}</span>
        <div style="display:flex;gap:8px">
          <button class="btn ghost" data-edit="${t.id}">Editar</button>
          <button class="btn-open" data-matricular="${t.id}">Matricular →</button>
        </div>
      </div>
    </article>`;
  }).join('');

  wrap.querySelectorAll('[data-edit]').forEach(btn => {
    btn.addEventListener('click', () => openTurmaModal(turmasCache.find(t => t.id === btn.dataset.edit)));
  });
  wrap.querySelectorAll('[data-matricular]').forEach(btn => {
    btn.addEventListener('click', () => openMatriculaModal(turmasCache.find(t => t.id === btn.dataset.matricular)));
  });
}

function populateTurmaSetorSelect(manterId) {
  const sel = $('turmaSetor');
  const ativos = setoresCache.filter(s => s.ativo !== false);
  sel.innerHTML = ativos.map(s => `<option value="${s.id}">${s.nome}</option>`).join('');
  // Se a turma em edição usa um setor desativado/removido da lista, mantém a opção pra não perder a seleção.
  if (manterId && !ativos.some(s => s.id === manterId)) {
    const opt = document.createElement('option');
    opt.value = manterId; opt.textContent = setorNome(manterId);
    sel.appendChild(opt);
  }
  if (manterId) sel.value = manterId;
}

function populateTurmaEmpresaSelect(manterId) {
  const sel = $('turmaEmpresa');
  const ativas = empresasCache.filter(e => e.ativo !== false);
  sel.innerHTML = ativas.map(e => `<option value="${e.id}">${e.nome}</option>`).join('');
  // Se a turma em edição usa uma empresa desativada/removida da lista, mantém a opção pra não perder a seleção.
  if (manterId && !ativas.some(e => e.id === manterId)) {
    const opt = document.createElement('option');
    opt.value = manterId; opt.textContent = empresaNome(manterId);
    sel.appendChild(opt);
  }
  if (manterId) sel.value = manterId;
}

function wireTurmaModal() {
  $('turmaModalidade').innerHTML = MOD_KEYS.map(k => `<option value="${k}">${MODS[k].emoji} ${MODS[k].name}</option>`).join('');
  $('turmaDias').innerHTML = WEEKDAYS_PT.map((d, i) => `<button type="button" data-dia="${i}">${d}</button>`).join('');
  $('turmaDias').addEventListener('click', e => {
    const btn = e.target.closest('button[data-dia]'); if (!btn) return;
    const dia = Number(btn.dataset.dia);
    if (turmaDiasSelecionados.has(dia)) turmaDiasSelecionados.delete(dia); else turmaDiasSelecionados.add(dia);
    btn.classList.toggle('on', turmaDiasSelecionados.has(dia));
  });
  $('btnNovaTurma').addEventListener('click', () => openTurmaModal(null));
  $('btnCloseTurma').addEventListener('click', closeTurmaModal);
  $('modalTurma').addEventListener('click', e => { if (e.target === $('modalTurma')) closeTurmaModal(); });
  // Cadastrar empresa/setor sem sair do formulário da turma: abre o modal por
  // cima, e ao salvar o item novo já volta selecionado — sem perder o que
  // estava preenchido aqui.
  $('btnAddEmpresaInline').addEventListener('click', () => { inlineTarget = 'empresa'; openEmpresaModal(null); });
  $('btnAddSetorInline').addEventListener('click', () => { inlineTarget = 'setor'; openSetorModal(null); });
  $('turmaAtivaRow').addEventListener('click', () => $('turmaAtivaRow').classList.toggle('present'));
  $('turmaForm').addEventListener('submit', async e => {
    e.preventDefault();
    if (!turmaDiasSelecionados.size) { toast('Selecione ao menos um dia da semana'); return; }
    const payload = {
      modalidade: $('turmaModalidade').value,
      horario: $('turmaHorario').value,
      setor: $('turmaSetor').value,
      empresa: $('turmaEmpresa').value,
      capacidade: Number($('turmaCapacidade').value) || 1,
      diasSemana: [...turmaDiasSelecionados].sort(),
    };
    if (editingTurmaId) {
      payload.ativa = $('turmaAtivaRow').classList.contains('present');
      await updateTurma(editingTurmaId, payload);
      closeTurmaModal();
      await refreshCadastros();
      toast('Turma atualizada');
      return;
    }
    const novaId = await createTurma(payload);
    closeTurmaModal();
    await refreshCadastros();
    // Uma turma sem alunos não serve pra nada: em vez de deixar a matrícula
    // como um passo escondido que o usuário precisa caçar depois, já abre.
    const nova = turmasCache.find(t => t.id === novaId);
    if (nova) {
      openMatriculaModal(nova);
      toast('Turma criada — agora escolha os alunos');
    } else {
      toast('Turma criada');
    }
  });
}

function openTurmaModal(turma) {
  editingTurmaId = turma ? turma.id : null;
  $('turmaModalTitle').textContent = turma ? 'Editar turma' : 'Nova turma';
  $('turmaModalidade').value = turma ? turma.modalidade : MOD_KEYS[0];
  $('turmaHorario').value = turma ? turma.horario : '08:00';
  populateTurmaSetorSelect(turma ? turma.setor : null);
  populateTurmaEmpresaSelect(turma ? turma.empresa : null);
  $('turmaCapacidade').value = turma ? turma.capacidade : 20;
  turmaDiasSelecionados = new Set(turma ? (turma.diasSemana || []) : []);
  $('turmaDias').querySelectorAll('button[data-dia]').forEach(b => b.classList.toggle('on', turmaDiasSelecionados.has(Number(b.dataset.dia))));
  $('turmaAtivaWrap').style.display = turma ? '' : 'none';
  $('turmaAtivaRow').classList.toggle('present', turma ? turma.ativa !== false : true);
  $('modalTurma').classList.add('show');
}
function closeTurmaModal() { $('modalTurma').classList.remove('show'); }

// ================== MATRÍCULA ==================
function wireMatriculaModal() {
  $('btnCloseMatricula').addEventListener('click', closeMatriculaModal);
  $('modalMatricula').addEventListener('click', e => { if (e.target === $('modalMatricula')) closeMatriculaModal(); });
  $('matriculaSearch').addEventListener('input', renderMatriculaList);
  $('matriculaList').addEventListener('click', e => {
    const row = e.target.closest('.s-row'); if (!row) return;
    const id = row.dataset.id;
    if (matriculaSelecionados.has(id)) matriculaSelecionados.delete(id); else matriculaSelecionados.add(id);
    row.classList.toggle('present', matriculaSelecionados.has(id));
  });
  $('btnMatriculaDone').addEventListener('click', async () => {
    if (!matriculaTurma) return;
    await matricular(matriculaTurma.id, [...matriculaSelecionados]);
    toast('Matrícula salva');
    closeMatriculaModal();
    await refreshCadastros();
  });
}

function openMatriculaModal(turma) {
  matriculaTurma = turma;
  matriculaSelecionados = new Set(turma.alunoIds || []);
  $('matriculaSub').textContent = `${MODS[turma.modalidade]?.name || turma.modalidade} ${turma.horario} · ${empresaNome(turma.empresa)} · Setor ${setorNome(turma.setor)}`;
  $('matriculaSearch').value = '';
  renderMatriculaList();
  $('modalMatricula').classList.add('show');
}
function closeMatriculaModal() { $('modalMatricula').classList.remove('show'); matriculaTurma = null; }

function renderMatriculaList() {
  const q = ($('matriculaSearch').value || '').toLowerCase().trim();
  const rows = alunosCache
    .filter(a => a.ativo !== false || matriculaSelecionados.has(a.id))
    .filter(a => !q || a.nome.toLowerCase().includes(q))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  $('matriculaList').innerHTML = rows.length ? rows.map(a => {
    const col = AV_COLORS[Math.abs(hashCode(a.id)) % AV_COLORS.length];
    return `<li class="s-row ${matriculaSelecionados.has(a.id) ? 'present' : ''}" data-id="${a.id}">
      <span class="s-ava" style="background:${col}22;color:${col}">${initials(a.nome)}</span>
      <span class="s-name">${a.nome}</span><span class="switch"></span></li>`;
  }).join('') : `<div class="no-results">Nenhum aluno encontrado 🔍</div>`;
}

// ================== SETORES ==================
function renderSetoresList() {
  const q = ($('setorSearch').value || '').toLowerCase().trim();
  const rows = setoresCache
    .filter(s => !q || s.nome.toLowerCase().includes(q))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

  $('setoresList').innerHTML = rows.length ? rows.map(s => {
    return `<div class="aluno-row" data-id="${s.id}">
      <span class="s-name">${s.nome}</span>
      <span class="status-chip ${s.ativo ? 'status-on' : 'status-off'}">${s.ativo ? 'Ativo' : 'Inativo'}</span>
      <button class="btn ghost" data-edit="${s.id}">Editar</button>
    </div>`;
  }).join('') : `<div class="empty"><div class="big">🏷️</div><h3>Nenhum setor cadastrado</h3><p>Clique em "Novo setor" para começar.</p></div>`;

  $('setoresList').querySelectorAll('[data-edit]').forEach(btn => {
    btn.addEventListener('click', () => openSetorModal(setoresCache.find(s => s.id === btn.dataset.edit)));
  });
}

function wireSetorModal() {
  $('btnNovoSetor').addEventListener('click', () => openSetorModal(null));
  $('btnCloseSetor').addEventListener('click', closeSetorModal);
  $('modalSetor').addEventListener('click', e => { if (e.target === $('modalSetor')) closeSetorModal(); });
  $('setorAtivoRow').addEventListener('click', () => $('setorAtivoRow').classList.toggle('present'));
  $('setorForm').addEventListener('submit', async e => {
    e.preventDefault();
    const nome = $('setorNome').value.trim();
    if (!nome) return;
    let novoId = null;
    if (editingSetorId) {
      await updateSetor(editingSetorId, { nome, ativo: $('setorAtivoRow').classList.contains('present') });
      toast('Setor atualizado');
    } else {
      novoId = await createSetor({ nome });
      toast('Setor criado');
    }
    const voltarPraTurma = inlineTarget === 'setor' && novoId;
    closeSetorModal();
    await refreshCadastros();
    if (voltarPraTurma) populateTurmaSetorSelect(novoId);
  });
}

function openSetorModal(setor) {
  editingSetorId = setor ? setor.id : null;
  $('setorModalTitle').textContent = setor ? 'Editar setor' : 'Novo setor';
  $('setorNome').value = setor ? setor.nome : '';
  $('setorAtivoWrap').style.display = setor ? '' : 'none';
  $('setorAtivoRow').classList.toggle('present', setor ? setor.ativo !== false : true);
  $('modalSetor').classList.toggle('on-top', inlineTarget === 'setor');
  $('modalSetor').classList.add('show');
}
function closeSetorModal() {
  $('modalSetor').classList.remove('show', 'on-top');
  if (inlineTarget === 'setor') inlineTarget = null;
}

// ================== EMPRESAS ==================
function renderEmpresasList() {
  const q = ($('empresaSearch').value || '').toLowerCase().trim();
  const rows = empresasCache
    .filter(e => !q || e.nome.toLowerCase().includes(q))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

  $('empresasList').innerHTML = rows.length ? rows.map(e => {
    return `<div class="aluno-row" data-id="${e.id}">
      <span class="s-name">${e.nome}</span>
      <span class="status-chip ${e.ativo ? 'status-on' : 'status-off'}">${e.ativo ? 'Ativo' : 'Inativo'}</span>
      <button class="btn ghost" data-edit="${e.id}">Editar</button>
    </div>`;
  }).join('') : `<div class="empty"><div class="big">🏢</div><h3>Nenhuma empresa cadastrada</h3><p>Clique em "Nova empresa" para começar.</p></div>`;

  $('empresasList').querySelectorAll('[data-edit]').forEach(btn => {
    btn.addEventListener('click', () => openEmpresaModal(empresasCache.find(e => e.id === btn.dataset.edit)));
  });
}

function wireEmpresaModal() {
  $('btnNovaEmpresa').addEventListener('click', () => openEmpresaModal(null));
  $('btnCloseEmpresa').addEventListener('click', closeEmpresaModal);
  $('modalEmpresa').addEventListener('click', e => { if (e.target === $('modalEmpresa')) closeEmpresaModal(); });
  $('empresaAtivoRow').addEventListener('click', () => $('empresaAtivoRow').classList.toggle('present'));
  $('empresaForm').addEventListener('submit', async e => {
    e.preventDefault();
    const nome = $('empresaNome').value.trim();
    if (!nome) return;
    let novoId = null;
    if (editingEmpresaId) {
      await updateEmpresa(editingEmpresaId, { nome, ativo: $('empresaAtivoRow').classList.contains('present') });
      toast('Empresa atualizada');
    } else {
      novoId = await createEmpresa({ nome });
      toast('Empresa criada');
    }
    const voltarPraTurma = inlineTarget === 'empresa' && novoId;
    closeEmpresaModal();
    await refreshCadastros();
    if (voltarPraTurma) populateTurmaEmpresaSelect(novoId);
  });
}

function openEmpresaModal(empresa) {
  editingEmpresaId = empresa ? empresa.id : null;
  $('empresaModalTitle').textContent = empresa ? 'Editar empresa' : 'Nova empresa';
  $('empresaNome').value = empresa ? empresa.nome : '';
  $('empresaAtivoWrap').style.display = empresa ? '' : 'none';
  $('empresaAtivoRow').classList.toggle('present', empresa ? empresa.ativo !== false : true);
  $('modalEmpresa').classList.toggle('on-top', inlineTarget === 'empresa');
  $('modalEmpresa').classList.add('show');
}
function closeEmpresaModal() {
  $('modalEmpresa').classList.remove('show', 'on-top');
  if (inlineTarget === 'empresa') inlineTarget = null;
}
