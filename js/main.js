import { $, cap } from './utils.js';
import { watchAuth, login, logout } from './auth.js';
import { initPresenca, renderDashboard } from './ui-presenca.js';
import { initAnalise, renderCharts } from './ui-analise.js';
import { initCadastros, refreshCadastros } from './ui-cadastros.js';

let appInited = false;

function wireTabs() {
  document.querySelectorAll('.app > .tabs > .tab').forEach(btn => btn.addEventListener('click', () => {
    if (btn.classList.contains('active')) return;
    document.querySelectorAll('.app > .tabs > .tab').forEach(b => b.classList.toggle('active', b === btn));
    document.querySelectorAll('.app > .section').forEach(s => s.classList.remove('active'));
    const tab = btn.dataset.tab;
    const secId = tab === 'presenca' ? 'sec-presenca' : tab === 'analise' ? 'sec-analise' : 'sec-cadastros';
    const sec = $(secId);
    void sec.offsetWidth;
    sec.classList.add('active');
    if (tab === 'presenca') renderDashboard();
    if (tab === 'analise') requestAnimationFrame(renderCharts);
    if (tab === 'cadastros') refreshCadastros();
  }));
}

function wireLogin() {
  $('loginForm').addEventListener('submit', async e => {
    e.preventDefault();
    $('loginError').textContent = '';
    try {
      await login($('loginEmail').value.trim(), $('loginSenha').value);
    } catch (err) {
      $('loginError').textContent = 'E-mail ou senha inválidos.';
    }
  });
  $('btnLogout').addEventListener('click', () => logout());
}

async function onUser(user) {
  document.body.classList.add('authed');
  $('userEmail').textContent = user.email || '';
  $('loginError').textContent = '';
  $('loginForm').reset();
  if (!appInited) {
    appInited = true;
    const now = new Date();
    $('todayChip').textContent = cap(now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }));
    wireTabs();
    // Chamadas em paralelo (não sequenciais): cada init*() liga seus próprios
    // listeners de forma síncrona antes de qualquer await interno (busca no
    // Firestore). Aguardar uma de cada vez atrasaria o wiring das abas
    // seguintes até a busca de dados da anterior terminar, deixando uma
    // janela real em que a UI já aparece liberada mas os botões ainda não
    // respondem — encontrado via verificação automatizada, não hipotético.
    await Promise.all([initPresenca(), initAnalise(), initCadastros()]);
  } else {
    await renderDashboard();
  }
}

function onGuest() {
  document.body.classList.remove('authed');
}

wireLogin();
watchAuth(onUser, onGuest);
