import { $, toast, countUp, initials, todayStr } from './utils.js';
import { MODS, MOD_KEYS, WEEKDAYS_PT, AV_COLORS, CHECKIN_STATUS } from './constants.js';
import { getAulasDoDia, getAulasDaSemana, savePresenca, listSetores, listEmpresas, isAtendido } from './data.js';
import { auth } from './firebase-config.js';

const state = { date: todayStr(), modality: 'all', sector: 'all', empresa: 'all', view: 'dia' };
let currentClasses = [];
let currentWeekItems = new Map(); // key: `${turmaId}_${date}` -> aula
let activeClass = null;

const presentOf = c => c.students.reduce((a, s) => a + (isAtendido(s.status) ? 1 : 0), 0);

export async function initPresenca() {
  $('fDate').value = state.date;
  $('fDate').addEventListener('change', e => { if (e.target.value) { state.date = e.target.value; renderDashboard(); } });

  const modOptions = `<option value="all">Todas as modalidades</option>` +
    MOD_KEYS.map(k => `<option value="${k}">${MODS[k].emoji} ${MODS[k].name}</option>`).join('');
  $('fMod').innerHTML = modOptions;
  $('fMod').addEventListener('change', e => { state.modality = e.target.value; renderDashboard(); });

  wireChips('fSector', v => { state.sector = v; renderDashboard(); });
  wireChips('fEmpresa', v => { state.empresa = v; renderDashboard(); });
  wireChips('fView', v => { state.view = v; renderDashboard(); });

  $('classList').addEventListener('click', e => {
    const card = e.target.closest('.class-card'); if (!card) return;
    const c = currentClasses.find(x => x.id === card.dataset.id);
    if (c) openModal(c);
  });
  $('weekView').addEventListener('click', e => {
    const item = e.target.closest('.semana-item'); if (!item) return;
    const c = currentWeekItems.get(item.dataset.key);
    if (c) openModal(c);
  });

  $('btnClose').addEventListener('click', closeModal);
  $('btnDone').addEventListener('click', closeModal);
  $('modal').addEventListener('click', e => { if (e.target === $('modal')) closeModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && $('modal').classList.contains('show')) closeModal(); });

  $('mList').addEventListener('click', async e => {
    const btn = e.target.closest('.checkin-chips .chip[data-status]'); if (!btn || !activeClass) return;
    const row = btn.closest('.s-row'); if (!row) return;
    const s = activeClass.students.find(x => x.id === row.dataset.id); if (!s) return;
    s.status = btn.dataset.status;
    row.querySelectorAll('.checkin-chips .chip').forEach(c => c.classList.toggle('active', c === btn));
    updateModalCounter();
    await persistActiveClass();
  });
  $('mSearch').addEventListener('input', renderStudents);
  $('btnAllFez').addEventListener('click', async () => {
    if (!activeClass) return;
    activeClass.students.forEach(s => s.status = 'foi_fez');
    renderStudents();
    await persistActiveClass();
  });
  $('btnAllFaltou').addEventListener('click', async () => {
    if (!activeClass) return;
    activeClass.students.forEach(s => s.status = 'faltou');
    renderStudents();
    await persistActiveClass();
  });

  window.clearFilters = clearFilters;
  await renderDashboard();
}

async function persistActiveClass() {
  if (!activeClass) return;
  const uid = auth.currentUser ? auth.currentUser.uid : null;
  const checkin = Object.fromEntries(activeClass.students.map(s => [s.id, s.status]));
  try {
    await savePresenca(activeClass.turmaId, activeClass.date, checkin, uid);
  } catch (e) {
    toast('Não foi possível salvar — verifique a conexão');
  }
}

function wireChips(containerId, cb) {
  $(containerId).addEventListener('click', e => {
    const b = e.target.closest('.chip'); if (!b) return;
    $(containerId).querySelectorAll('.chip').forEach(x => x.classList.remove('active'));
    b.classList.add('active'); cb(b.dataset.v);
  });
}

async function renderSectorChips() {
  const setores = await listSetores();
  const options = [{ id: 'all', nome: 'Todos os setores' }, ...setores.filter(s => s.ativo !== false)];
  $('fSector').innerHTML = options.map(o =>
    `<button class="chip ${o.id === state.sector ? 'active' : ''}" data-v="${o.id}">${o.nome}</button>`).join('');
}

async function renderEmpresaChips() {
  const empresas = await listEmpresas();
  const options = [{ id: 'all', nome: 'Todas as empresas' }, ...empresas.filter(e => e.ativo !== false)];
  $('fEmpresa').innerHTML = options.map(o =>
    `<button class="chip ${o.id === state.empresa ? 'active' : ''}" data-v="${o.id}">${o.nome}</button>`).join('');
}

function matchesFilters(c) {
  return (state.modality === 'all' || c.mod === state.modality) &&
    (state.sector === 'all' || c.sector === state.sector) &&
    (state.empresa === 'all' || c.empresa === state.empresa);
}
function filteredClasses() { return currentClasses.filter(matchesFilters); }

export async function renderDashboard() {
  // Chips e aulas em paralelo; se os chips falharem (ex.: coleção ilegível),
  // mantêm o estado atual ("Todos") e a grade de aulas renderiza mesmo assim.
  const chipsP = Promise.all([renderSectorChips(), renderEmpresaChips()])
    .catch(e => console.error('Filtros indisponíveis:', e));
  currentClasses = await getAulasDoDia(state.date);
  await chipsP;
  const list = filteredClasses();

  // Os cartões de estatística sempre refletem só o dia selecionado, mesmo na visão Semana.
  const present = list.reduce((a, c) => a + presentOf(c), 0);
  const capacity = list.reduce((a, c) => a + c.capacity, 0);
  const occ = capacity ? present / capacity : 0;
  countUp($('stPresentes'), present);
  countUp($('stPrevistos'), capacity);
  countUp($('stOcup'), occ * 100, { suffix: '%' });
  countUp($('stAulas'), list.length);

  $('classList').style.display = state.view === 'dia' ? '' : 'none';
  $('weekView').style.display = state.view === 'semana' ? '' : 'none';

  if (state.view === 'dia') {
    renderDayGrid(list);
  } else {
    await renderWeekGrid();
  }
}

function renderDayGrid(list) {
  const wrap = $('classList');
  if (!list.length) {
    wrap.innerHTML = `<div class="empty"><div class="big">🗓️</div><h3>Nenhuma aula encontrada</h3>
      <p>Ajuste os filtros, escolha outra data, ou cadastre turmas em "Cadastros".</p>
      <button onclick="clearFilters()">Limpar filtros</button></div>`;
    return;
  }
  wrap.innerHTML = list.map((c, i) => {
    const m = MODS[c.mod] || { name: c.mod, emoji: '❓', soft: '#eee' };
    const p = presentOf(c), r = c.capacity ? p / c.capacity : 0;
    const st = r >= 1 ? { t: 'Lotada', cls: 'occ-red', bar: 'var(--red)' }
      : r >= 0.75 ? { t: 'Quase lotada', cls: 'occ-yellow', bar: 'var(--yellow)' }
      : { t: 'Tranquila', cls: 'occ-green', bar: 'var(--aqua)' };
    return `<article class="class-card" data-id="${c.id}" style="animation-delay:${i * 50}ms">
      <div class="cc-top">
        <div class="mod-badge" style="background:${m.soft}">${m.emoji}</div>
        <div class="cc-info"><h4>${m.name}</h4><p>${c.empresaName} · Setor ${c.sectorName} · ${c.capacity} vagas</p></div>
        <span class="time-chip">${c.time}</span>
      </div>
      <div class="cc-count"><b>${p}</b><span>/ ${c.capacity} presentes</span></div>
      <div class="bar"><i style="width:${Math.max(4, r * 100)}%;background:${st.bar}"></i></div>
      <div class="cc-foot">
        <span class="occ-chip ${st.cls}">${st.t}</span>
        <button class="btn-open">Registrar presença →</button>
      </div>
    </article>`;
  }).join('');
}

async function renderWeekGrid() {
  const weekData = await getAulasDaSemana(state.date);
  currentWeekItems = new Map();
  const hoje = todayStr();
  $('weekView').innerHTML = weekData.map(day => {
    const aulas = day.aulas.filter(matchesFilters);
    aulas.forEach(a => currentWeekItems.set(`${a.id}_${a.date}`, a));
    const dnum = parseInt(day.date.slice(8), 10);
    const items = aulas.length ? aulas.map(a => {
      const m = MODS[a.mod] || { name: a.mod, emoji: '❓' };
      return `<div class="semana-item" data-key="${a.id}_${a.date}">
        <div class="si-top"><span>${m.emoji}</span><span>${a.time}</span></div>
        <div class="si-mod">${m.name} · ${a.empresaName}</div>
      </div>`;
    }).join('') : `<div class="semana-empty">Sem aulas</div>`;
    return `<div class="semana-col">
      <div class="semana-col-head ${day.date === hoje ? 'today' : ''}">${WEEKDAYS_PT[day.dow]} ${dnum}</div>
      ${items}
    </div>`;
  }).join('');
}

function clearFilters() {
  state.modality = 'all'; state.sector = 'all';
  $('fMod').value = 'all';
  renderDashboard();
}

function openModal(c) {
  activeClass = c;
  const m = MODS[c.mod] || { name: c.mod, emoji: '❓', soft: '#eee' };
  $('mBadge').textContent = m.emoji; $('mBadge').style.background = m.soft;
  $('mTitle').textContent = m.name;
  $('mSub').textContent = `${c.time} · ${c.empresaName} · Setor ${c.sectorName} · ${c.capacity} vagas`;
  $('mSearch').value = '';
  $('mPresent').dataset.v = '0';
  renderStudents();
  $('modal').classList.add('show');
  document.body.classList.add('no-scroll');
}

function closeModal() {
  if (!activeClass) return;
  $('modal').classList.remove('show');
  document.body.classList.remove('no-scroll');
  const p = presentOf(activeClass);
  const m = MODS[activeClass.mod] || { name: activeClass.mod };
  toast(`Presença salva · ${m.name} ${activeClass.time} — ${p}/${activeClass.capacity}`);
  activeClass = null;
  renderDashboard();
}

function renderStudents() {
  const q = ($('mSearch').value || '').toLowerCase().trim();
  const rows = activeClass.students.filter(s => !q || s.name.toLowerCase().includes(q));
  $('mList').innerHTML = rows.length ? rows.map(s => {
    const col = AV_COLORS[Math.abs(hashCode(s.id)) % AV_COLORS.length];
    const chips = CHECKIN_STATUS.map(cs =>
      `<button type="button" class="chip ${s.status === cs.value ? 'active' : ''}" data-status="${cs.value}">${cs.label}</button>`).join('');
    return `<li class="s-row" data-id="${s.id}">
      <span class="s-ava" style="background:${col}22;color:${col}">${initials(s.name)}</span>
      <span class="s-name">${s.name}</span>
      <div class="chips checkin-chips">${chips}</div></li>`;
  }).join('') : `<div class="no-results">Nenhum aluno encontrado 🔍</div>`;
  updateModalCounter();
}

function updateModalCounter() {
  const p = presentOf(activeClass), r = activeClass.capacity ? p / activeClass.capacity : 0;
  countUp($('mPresent'), p, { dur: 350 });
  $('mCap').textContent = activeClass.capacity;
  const bar = $('mBar'); bar.style.width = Math.max(3, r * 100) + '%';
  bar.style.background = r >= 1 ? 'var(--red)' : r >= 0.75 ? 'var(--yellow)' : 'var(--aqua)';
}

function hashCode(str) { let h = 0; for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0; return h; }
