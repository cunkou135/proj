import { qs, esc } from '../utils/dom.js';
import { dataService } from '../data/data-service.js';
import { fmtMoney } from '../utils/money.js';
import { mkChart, themeColor } from '../features/charts.js';

export function renderFinance() {
  const data = dataService.getData();
  const fins = data.finances || [];
  const totalIn = fins.filter((f) => f.type === 'income').reduce((s, f) => s + Number(f.amount), 0);
  const totalEx = fins.filter((f) => f.type === 'expense').reduce((s, f) => s + Number(f.amount), 0);
  const totalReim = fins.filter((f) => f.type === 'reimburse' && !f.reimbursed).reduce((s, f) => s + Number(f.amount), 0);
  const totalReimbursed = fins.filter((f) => f.type === 'reimburse' && f.reimbursed).reduce((s, f) => s + Number(f.amount), 0);
  qs('#finIncome').innerText = fmtMoney(totalIn);
  qs('#finExpense').innerText = fmtMoney(totalEx);
  qs('#finBalance').innerText = fmtMoney(totalIn - totalEx + totalReimbursed);
  qs('#finReimburse').innerText = fmtMoney(totalReim);
  qs('#finReimbursedAmt').innerText = fmtMoney(totalReimbursed);

  // Month filter options
  const months = new Set();
  fins.forEach((f) => { if (f.date) months.add(f.date.substring(0, 7)); });
  const mf = qs('#finMonthFilter');
  const curVal = mf.value;
  mf.innerHTML = '<option value="">全部月份</option>' + [...months].sort().reverse().map((m) => '<option value="' + m + '">' + m + '</option>').join('');
  mf.value = curVal;

  // Monthly chart
  const now = new Date();
  const mc = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    mc.push(d.getFullYear() + '-' + (d.getMonth() + 1).toString().padStart(2, '0'));
  }
  const mInc = mc.map((m) => fins.filter((f) => f.type === 'income' && f.date && f.date.startsWith(m)).reduce((s, f) => s + Number(f.amount), 0));
  const mExp = mc.map((m) => fins.filter((f) => f.type === 'expense' && f.date && f.date.startsWith(m)).reduce((s, f) => s + Number(f.amount), 0));
  const tc = themeColor('--text-main') || '#f8fafc';
  mkChart('finMonth', qs('#finMonthChart'), {
    type: 'bar',
    data: {
      labels: mc.map((m) => { const [, mo] = m.split('-'); return mo + '月'; }),
      datasets: [
        { label: '收入', data: mInc, backgroundColor: '#059669', borderRadius: 4 },
        { label: '支出', data: mExp, backgroundColor: '#dc2626', borderRadius: 4 },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      scales: {
        x: { ticks: { color: tc, font: { size: 10 } }, grid: { display: false } },
        y: { beginAtZero: true, ticks: { color: tc }, grid: { color: themeColor('--border-color') } },
      },
      plugins: { legend: { labels: { color: tc, font: { size: 11 } } } },
    },
  });

  // Category pie
  const catMap = {};
  fins.filter((f) => f.type === 'expense').forEach((f) => { catMap[f.category || '其他'] = (catMap[f.category || '其他'] || 0) + Number(f.amount); });
  const catLabels = Object.keys(catMap);
  const catData = Object.values(catMap);
  const catColors = ['#4f46e5', '#059669', '#d97706', '#dc2626', '#8b5cf6', '#06b6d4', '#f43f5e', '#84cc16', '#f59e0b'];
  mkChart('finCat', qs('#finCatChart'), {
    type: 'doughnut',
    data: {
      labels: catLabels.length ? catLabels : ['暂无'],
      datasets: [{
        data: catData.length ? catData : [1],
        backgroundColor: catData.length ? catColors.slice(0, catLabels.length) : ['var(--bg-hover)'],
        borderWidth: 0,
      }],
    },
    options: {
      responsive: true, maintainAspectRatio: false, cutout: '60%',
      plugins: { legend: { position: 'right', labels: { color: tc, font: { size: 10 }, padding: 8 } } },
    },
  });

  // List
  const tf = qs('#finTypeFilter') ? qs('#finTypeFilter').value : '';
  const mmf = qs('#finMonthFilter') ? qs('#finMonthFilter').value : '';
  let filtered = [...fins];
  if (tf) filtered = filtered.filter((f) => f.type === tf);
  if (mmf) filtered = filtered.filter((f) => f.date && f.date.startsWith(mmf));
  filtered.sort((a, b) => b.date.localeCompare(a.date));
  const typeLabel = { income: '收入', expense: '支出', reimburse: '报账' };
  const typeCls = { income: 'fin-type-income', expense: 'fin-type-expense', reimburse: 'fin-type-reimburse' };
  qs('#finList').innerHTML = filtered.length
    ? filtered.map((f) => {
        const sign = f.type === 'income' ? '+' : '-';
        return '<div class="list-item ' + (typeCls[f.type] || '') + '" data-action="editFin" data-id="' + f.id + '"><div class="item-content"><div class="item-title">' + esc(f.desc || f.category || '未命名') + '</div><div class="item-meta"><span class="badge badge-outline">' + (typeLabel[f.type] || f.type) + '</span><span>' + esc(f.category || '') + '</span><span>' + f.date + '</span>' + (f.type === 'reimburse' ? (f.reimbursed ? '<span style="color:var(--success)">已到账</span>' : '<span style="color:var(--warning)">待到账</span>') : '') + '</div></div><div class="fin-amount" style="color:' + (f.type === 'income' ? 'var(--success)' : 'var(--danger)') + '">' + sign + fmtMoney(f.amount).slice(1) + '</div><button class="btn-icon" data-action="delFin" data-id="' + f.id + '">✕</button></div>';
      }).join('')
    : '<div style="color:var(--text-muted);padding:24px;text-align:center">暂无账单记录</div>';
}
