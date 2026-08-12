import { $, cap, fmt, countUp, todayStr, monthDays, pad2 } from './utils.js';
import { MODS, MOD_KEYS, MONTHS_PT } from './constants.js';
import { getPresencasEntre, listTurmas } from './data.js';

const state = { month: todayStr().slice(0, 7), aModality: 'all', aSector: 'all' };
let charts = null, chartsInit = false;

export async function initAnalise() {
  const modOptions = `<option value="all">Todas as modalidades</option>` +
    MOD_KEYS.map(k => `<option value="${k}">${MODS[k].emoji} ${MODS[k].name}</option>`).join('');
  $('fModA').innerHTML = modOptions;
  $('fModA').addEventListener('change', e => { state.aModality = e.target.value; renderCharts(); });

  wireChips('fSectorA', v => { state.aSector = v; renderCharts(); });

  const sel = $('fMonth'), now = new Date();
  for (let i = 0; i < 18; i++) {
    const dt = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const v = `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}`;
    const o = document.createElement('option');
    o.value = v; o.textContent = `${cap(dt.toLocaleDateString('pt-BR', { month: 'long' }))} / ${dt.getFullYear()}`;
    if (v === state.month) o.selected = true;
    sel.appendChild(o);
  }
  sel.addEventListener('change', e => { state.month = e.target.value; renderCharts(); });
}

function wireChips(containerId, cb) {
  $(containerId).addEventListener('click', e => {
    const b = e.target.closest('.chip'); if (!b) return;
    $(containerId).querySelectorAll('.chip').forEach(x => x.classList.remove('active'));
    b.classList.add('active'); cb(b.dataset.v);
  });
}

async function analyticsData() {
  const ym = state.month, [year, mon] = ym.split('-').map(Number);
  const t = todayStr();
  const filter = { modalidade: state.aModality, setor: state.aSector };

  const [yearCurDocs, yearPrevDocs, turmas] = await Promise.all([
    getPresencasEntre(`${year}-01-01`, `${year}-12-31`, filter),
    getPresencasEntre(`${year - 1}-01-01`, `${year - 1}-12-31`, filter),
    listTurmas(),
  ]);
  const turmaCapMap = new Map(turmas.map(tu => [tu.id, tu.capacidade]));

  const dateSum = {};
  yearCurDocs.forEach(p => { dateSum[p.data] = (dateSum[p.data] || 0) + (p.presentes ? p.presentes.length : 0); });
  const datesWithRecord = new Set(yearCurDocs.map(p => p.data));

  const dateSumPrev = {};
  yearPrevDocs.forEach(p => { dateSumPrev[p.data] = (dateSumPrev[p.data] || 0) + (p.presentes ? p.presentes.length : 0); });

  const mDays = monthDays(ym);
  const mDaysSet = new Set(mDays);
  const mData = mDays.map(d => (d > t || !datesWithRecord.has(d)) ? null : dateSum[d]);
  const mLabels = mDays.map(d => String(parseInt(d.slice(8), 10)));

  const yCur = Array(12).fill(null), yPrev = Array(12).fill(0);
  for (let m = 1; m <= 12; m++) {
    const days = monthDays(`${year}-${pad2(m)}`).filter(d => d <= t && datesWithRecord.has(d));
    yCur[m - 1] = days.length ? days.reduce((a, d) => a + dateSum[d], 0) : null;
    yPrev[m - 1] = monthDays(`${year - 1}-${pad2(m)}`).reduce((a, d) => a + (dateSumPrev[d] || 0), 0);
  }
  const totalCur = yCur.reduce((a, v) => a + (v || 0), 0);
  const monthsElapsed = yCur.filter(v => v !== null).length;
  const media = monthsElapsed ? totalCur / monthsElapsed : 0;
  const prevPeriod = yPrev.slice(0, monthsElapsed).reduce((a, v) => a + v, 0);
  const delta = prevPeriod ? ((totalCur - prevPeriod) / prevPeriod * 100) : 0;
  let bestIdx = 0, bestVal = -1;
  yCur.forEach((v, i) => { if (v !== null && v > bestVal) { bestVal = v; bestIdx = i; } });

  const donut = MOD_KEYS.map(id => {
    let p = 0, cpVal = 0;
    yearCurDocs.forEach(doc => {
      if (doc.modalidade === id && mDaysSet.has(doc.data)) {
        p += doc.presentes ? doc.presentes.length : 0;
        cpVal += turmaCapMap.get(doc.turmaId) || 0;
      }
    });
    return { id, p, cp: cpVal };
  });
  const totalDonut = donut.reduce((a, x) => a + x.p, 0);
  const totalCap = donut.reduce((a, x) => a + x.cp, 0);
  const totalOcc = totalCap ? totalDonut / totalCap : 0;

  return {
    year, mon, mLabels, mData, yCur, yPrev, totalCur, media, delta, bestIdx, bestVal,
    monthsElapsed, donut, totalDonut, totalOcc, monthName: MONTHS_PT[mon - 1],
  };
}

function areaGrad(chartCtx, rgb) {
  const cx = chartCtx.chart.ctx, a = chartCtx.chart.chartArea;
  if (!a) return `rgba(${rgb},.2)`;
  const g = cx.createLinearGradient(0, a.bottom, 0, a.top);
  g.addColorStop(0, `rgba(${rgb},0)`); g.addColorStop(1, `rgba(${rgb},.30)`); return g;
}
function barGrad(chartCtx) {
  const cx = chartCtx.chart.ctx, a = chartCtx.chart.chartArea;
  if (!a) return 'rgba(62,198,168,.8)';
  const g = cx.createLinearGradient(0, a.bottom, 0, a.top);
  g.addColorStop(0, 'rgba(62,198,168,.45)'); g.addColorStop(1, 'rgba(35,169,140,.95)'); return g;
}
function donutLabelFn(d) { return function (c) { const x = d.donut[c.dataIndex]; const share = d.totalDonut ? Math.round(x.p / d.totalDonut * 100) : 0; return ` ${fmt(x.p)} presenças (${share}%)`; }; }
function donutAfterFn(d) { return function (c) { const x = d.donut[c.dataIndex]; return ` Ocupação: ${x.cp ? Math.round(x.p / x.cp * 100) : 0}%`; }; }

export async function renderCharts() {
  const d = await analyticsData();

  countUp($('kTotal'), d.totalCur);
  $('kTotalLbl').textContent = `Total de presenças · ${d.year}`;
  countUp($('kMedia'), d.media);
  const kd = $('kDelta');
  kd.textContent = (d.delta >= 0 ? '+' : '') + d.delta.toFixed(1).replace('.', ',') + '%';
  kd.className = 'stat-value kpi-delta ' + (d.delta >= 0 ? 'up' : 'down');
  $('kDeltaLbl').textContent = `vs. ${d.year - 1} (mesmo período)`;
  $('kBest').textContent = d.bestVal > 0 ? `${MONTHS_PT[d.bestIdx].slice(0, 3)} · ${fmt(d.bestVal)}` : '—';

  $('mTitle').textContent = `${cap(d.monthName)} de ${d.year}`;
  $('mTag').textContent = state.month === todayStr().slice(0, 7) ? 'considerado até hoje' : 'mês completo';
  $('yTitle').textContent = `Presenças por mês · ${d.year} vs ${d.year - 1}`;
  $('dTitle').textContent = `${cap(d.monthName)} de ${d.year}`;

  $('donutLegend').innerHTML = d.donut.map(x => {
    const m = MODS[x.id], pct = x.cp ? Math.round(x.p / x.cp * 100) : 0;
    return `<div class="dl-row">
      <div class="dl-top"><span class="dl-dot" style="background:${m.color}"></span>
        <span class="dl-name">${m.emoji} ${m.name}</span>
        <span class="dl-val">${fmt(x.p)}</span><span class="dl-pct">${pct}%</span></div>
      <div class="dl-bar"><i style="width:${pct}%;background:${m.color}"></i></div></div>`;
  }).join('');

  if (typeof Chart === 'undefined') {
    $('chartsGrid').innerHTML = '<div class="card chart-card span3"><p style="color:var(--muted);font-weight:600">Não foi possível carregar a biblioteca de gráficos. Verifique a conexão.</p></div>';
    return;
  }

  if (!chartsInit) {
    Chart.defaults.font.family = "'Plus Jakarta Sans',system-ui,sans-serif";
    Chart.defaults.color = '#7B8A96';
    Chart.defaults.plugins.tooltip.backgroundColor = '#22313C';
    Chart.defaults.plugins.tooltip.padding = 12;
    Chart.defaults.plugins.tooltip.cornerRadius = 12;
    Chart.defaults.plugins.tooltip.titleFont = { weight: 700 };
    Chart.defaults.plugins.tooltip.displayColors = false;
    Chart.register({
      id: 'centerText', afterDraw(chart) {
        const o = chart.config.options.plugins.centerText; if (!o) return;
        const meta = chart.getDatasetMeta(0); if (!meta.data.length) return;
        const pt = meta.data[0], c = chart.ctx; c.save(); c.textAlign = 'center'; c.textBaseline = 'middle';
        c.font = "800 26px 'Plus Jakarta Sans'"; c.fillStyle = '#22313C'; c.fillText(o.text, pt.x, pt.y - 8);
        c.font = "600 12px 'Plus Jakarta Sans'"; c.fillStyle = '#7B8A96'; c.fillText(o.sub, pt.x, pt.y + 14); c.restore();
      },
    });

    charts = {
      monthly: new Chart($('chMonthly'), {
        type: 'bar',
        data: { labels: d.mLabels, datasets: [{ data: d.mData, skipNull: true, borderRadius: 7, borderSkipped: false, maxBarThickness: 26, backgroundColor: barGrad, hoverBackgroundColor: '#23A98C' }] },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false }, tooltip: { callbacks: { title: it => `Dia ${it[0].label} de ${d.monthName}`, label: c => ` ${c.parsed.y} presenças` } } },
          scales: { x: { grid: { display: false }, ticks: { font: { size: 10.5 }, maxRotation: 0, autoSkip: true } }, y: { beginAtZero: true, grid: { color: 'rgba(34,49,60,.06)' }, border: { display: false }, ticks: { precision: 0 } } },
        },
      }),
      yearly: new Chart($('chYearly'), {
        type: 'line',
        data: {
          labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'],
          datasets: [
            { label: String(d.year), data: d.yCur, borderColor: '#3EC6A8', borderWidth: 2.6, tension: .4, fill: true, backgroundColor: (cx) => areaGrad(cx, '62,198,168'), pointRadius: 3.5, pointBackgroundColor: '#fff', pointBorderColor: '#3EC6A8', pointBorderWidth: 2, pointHoverRadius: 6, spanGaps: false },
            { label: String(d.year - 1), data: d.yPrev, borderColor: '#8F7FE8', borderWidth: 2, borderDash: [6, 5], tension: .4, fill: false, pointRadius: 2.5, pointBackgroundColor: '#8F7FE8', pointHoverRadius: 5 },
          ],
        },
        options: {
          responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
          plugins: { legend: { position: 'top', align: 'end', labels: { usePointStyle: true, pointStyle: 'circle', boxWidth: 8, font: { size: 12, weight: 700 } } }, tooltip: { callbacks: { label: c => ` ${c.dataset.label}: ${fmt(c.parsed.y)} presenças` } } },
          scales: { x: { grid: { display: false } }, y: { beginAtZero: true, grid: { color: 'rgba(34,49,60,.06)' }, border: { display: false } } },
        },
      }),
      donut: new Chart($('chDonut'), {
        type: 'doughnut',
        data: { labels: d.donut.map(x => MODS[x.id].name), datasets: [{ data: d.donut.map(x => x.p), backgroundColor: d.donut.map(x => MODS[x.id].color), borderColor: '#fff', borderWidth: 3, hoverOffset: 10 }] },
        options: { responsive: true, maintainAspectRatio: false, cutout: '68%', plugins: { centerText: { text: Math.round(d.totalOcc * 100) + '%', sub: 'ocupação média' }, legend: { display: false }, tooltip: { callbacks: { label: donutLabelFn(d), afterLabel: donutAfterFn(d) } } } },
      }),
    };
    chartsInit = true;
  } else {
    charts.monthly.data.labels = d.mLabels;
    charts.monthly.data.datasets[0].data = d.mData;
    charts.monthly.options.plugins.tooltip.callbacks.title = it => `Dia ${it[0].label} de ${d.monthName}`;
    charts.yearly.data.datasets[0].data = d.yCur;
    charts.yearly.data.datasets[0].label = String(d.year);
    charts.yearly.data.datasets[1].data = d.yPrev;
    charts.yearly.data.datasets[1].label = String(d.year - 1);
    charts.donut.data.datasets[0].data = d.donut.map(x => x.p);
    charts.donut.options.plugins.centerText.text = Math.round(d.totalOcc * 100) + '%';
    charts.donut.options.plugins.tooltip.callbacks.label = donutLabelFn(d);
    charts.donut.options.plugins.tooltip.callbacks.afterLabel = donutAfterFn(d);
    Object.values(charts).forEach(ch => ch.update());
  }
}
