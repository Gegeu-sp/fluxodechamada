import { $, toast, countUp, initials, todayStr } from './utils.js';
import { MODS, MOD_KEYS, AV_COLORS } from './constants.js';
import { getAulasDoDia, savePresenca } from './data.js';
import { auth } from './firebase-config.js';

const state = { date: todayStr(), modality: 'all', sector: 'all' };
let currentClasses = [];
let activeClass = null;

const presentOf = c => c.students.reduce((a, s) => a + (s.present ? 1 : 0), 0);

export async function initPresenca() {
  $('fDate').value = state.date;
  $('fDate').addEventListener('change', e => { if (e.target.value) { state.date = e.target.value; renderDashboard(); } });

  const modOptions = `<option value="all">Todas as modalidades</option>` +
    MOD_KEYS.map(k => `<option value="${k}">${MODS[k].emoji} ${MODS[k].name}</option>`).join('');
  $('fMod').innerHTML = modOptions;
  $('fMod').addEventListener('change', e => { state.modality = e.target.value; renderDashboard(); });

  wireChips('fSector', v => { state.sector = v; renderDashboard(); });

  $('classList').addEventListener('click', e => {
    const card = e.target.closest('.class-card'); if (!card) return;
    const c = currentClasses.find(x => x.id === card.dataset.id);
    if (c) openModal(c);
  });

  $('btnClose').addEventListener('click', closeModal);
  $('btnDone').addEventListener('click', closeModal);
  $('modal').addEventListener('click', e => { if (e.target === $('modal')) closeModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && $('modal').classList.contains('show')) closeModal(); });

  $('mList').addEventListener('click', async e => {
    const row = e.target.closest('.s-row'); if (!row || !activeClass) return;
    const s = activeClass.students.find(x => x.id === row.dataset.id); if (!s) return;
    s.present = !s.present;
    row.classList.toggle('present', s.present);
    updateModalCounter();
    await persistActiveClass();
  });
  $('mSearch').addEventListener('input', renderStudents);
  $('btnAll').addEventListener('click', async () => {
    if (!activeClass) return;
    activeClass.students.forEach(s => s.present = true);
    renderStudents();
    await persistActiveClass();
  });
  $('btnNone').addEventListener('click', async () => {
    if (!activeClass) return;
    activeClass.students.forEach(s => s.present = false);
    renderStudents();
    await persistActiveClass();
  });

  window.clearFilters = clearFilters;
  await renderDashboard();
}

async function persistActiveClass() {
  if (!activeClass) return;
  const uid = auth.currentUser ? auth.currentUser.uid : null;
  const presentIds = activeClass.students.filter(s => s.present).map(s => s.id);
  try {
    await savePresenca(activeClass.turmaId, activeClass.date, presentIds, uid);
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

function filteredClasses() {
  return currentClasses.filter(c =>
    (state.modality === 'all' || c.mod === state.modality) &&
    (state.sector === 'all' || c.sector === state.sector));
}

export async function renderDashboard() {
  currentClasses = await getAulasDoDia(state.date);
  const list = filteredClasses();
  const present = list.reduce((a, c) => a + presentOf(c), 0);
  const capacity = list.reduce((a, c) => a + c.capacity, 0);
  const occ = capacity ? present / capacity : 0;
  countUp($('stPresentes'), present);
  countUp($('stPrevistos'), capacity);
  countUp($('stOcup'), occ * 100, { suffix: '%' });
  countUp($('stAulas'), list.length);

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
        <div class="cc-info"><h4>${m.name}</h4><p>Setor ${c.sector} · ${c.capacity} vagas</p></div>
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

function clearFilters() {
  state.modality = 'all'; state.sector = 'all';
  $('fMod').value = 'all';
  document.querySelectorAll('#fSector .chip').forEach(b => b.classList.toggle('active', b.dataset.v === 'all'));
  renderDashboard();
}

function openModal(c) {
  activeClass = c;
  const m = MODS[c.mod] || { name: c.mod, emoji: '❓', soft: '#eee' };
  $('mBadge').textContent = m.emoji; $('mBadge').style.background = m.soft;
  $('mTitle').textContent = m.name;
  $('mSub').textContent = `${c.time} · Setor ${c.sector} · ${c.capacity} vagas`;
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
    return `<li class="s-row ${s.present ? 'present' : ''}" data-id="${s.id}">
      <span class="s-ava" style="background:${col}22;color:${col}">${initials(s.name)}</span>
      <span class="s-name">${s.name}</span><span class="switch"></span></li>`;
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
