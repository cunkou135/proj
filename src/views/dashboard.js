import { qs, esc } from '../utils/dom.js';
import { today } from '../utils/date.js';
import { dataService } from '../data/data-service.js';
import { mkChart, themeColor } from '../features/charts.js';

const stL = { todo: '待办', 'in-progress': '进行中', done: '已完成' };

export function renderDash() {
  const data = dataService.getData();
  const now = new Date();
  const total = data.tasks.length;
  const todoC = data.tasks.filter((t) => t.status === 'todo').length;
  const progC = data.tasks.filter((t) => t.status === 'in-progress').length;
  const doneC = data.tasks.filter((t) => t.status === 'done').length;
  const overdueC = data.tasks.filter((t) => t.status !== 'done' && t.deadline && new Date(t.deadline) < now).length;
  const wk = new Date();
  wk.setDate(wk.getDate() - 7);
  const weekP = data.pomoRecords.filter((r) => new Date(r.date) >= wk).length;
  const td = today();
  const habDone = data.habits.filter((h) => data.habitLogs.some((l) => l.id === h.id && l.date === td)).length;

  qs('#statTotal').innerText = total;
  qs('#statTodo').innerText = todoC;
  qs('#statProg').innerText = progC;
  qs('#statDone').innerText = doneC;
  qs('#statDdl').innerText = overdueC;
  qs('#statPomo').innerText = weekP;
  qs('#statHabitRate').innerText = data.habits.length ? habDone + '/' + data.habits.length : '-';

  const tc = themeColor('--text-main') || '#f8fafc';
  mkChart('dash', qs('#taskChart'), {
    type: 'doughnut',
    data: {
      labels: ['待办', '进行中', '已完成'],
      datasets: [{ data: [todoC, progC, doneC], backgroundColor: ['#d97706', '#4f46e5', '#059669'], borderWidth: 0 }],
    },
    options: {
      responsive: true, maintainAspectRatio: false, cutout: '65%',
      plugins: { legend: { position: 'bottom', labels: { color: tc, font: { family: 'Inter', size: 11 }, padding: 12 } } },
    },
  });

  const days7 = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days7.push(d.toISOString().split('T')[0]);
  }
  const dayLabels = days7.map((d) => { const dt = new Date(d); return dt.getMonth() + 1 + '/' + dt.getDate(); });
  const dayPomos = days7.map((d) => data.pomoRecords.filter((r) => r.date === d).length);
  const dayHabits = days7.map((d) => data.habitLogs.filter((l) => l.date === d).length);
  mkChart('focusTrend', qs('#focusTrendChart'), {
    type: 'bar',
    data: {
      labels: dayLabels,
      datasets: [
        { label: '番茄', data: dayPomos, backgroundColor: '#4f46e5', borderRadius: 4 },
        { label: '习惯打卡', data: dayHabits, backgroundColor: '#059669', borderRadius: 4 },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      scales: {
        x: { ticks: { color: tc, font: { size: 10 } }, grid: { display: false } },
        y: { beginAtZero: true, ticks: { color: tc, stepSize: 1 }, grid: { color: themeColor('--border-color') } },
      },
      plugins: { legend: { labels: { color: tc, font: { size: 11 } } } },
    },
  });

  // DDL
  const ddls = data.tasks.filter((t) => t.status !== 'done' && t.deadline).sort((a, b) => new Date(a.deadline) - new Date(b.deadline)).slice(0, 5);
  qs('#dashDdlList').innerHTML = ddls.length
    ? ddls.map((t) => {
        const od = new Date(t.deadline) < now;
        return '<div class="list-item" data-action="editTask" data-id="' + t.id + '"><div class="item-icon-dot" style="background:' + (od ? 'var(--danger)' : 'var(--warning)') + '"></div><div class="item-content"><div class="item-title">' + esc(t.title) + '</div><div class="item-meta">' + (od ? '<span style="color:var(--danger)">已超期</span>' : '') + 'DDL: ' + t.deadline + '</div></div></div>';
      }).join('')
    : '<div style="color:var(--text-muted);padding:12px">无紧急截止</div>';

  // Habits today
  qs('#dashHabitList').innerHTML = data.habits.length
    ? data.habits.map((h) => {
        const d = data.habitLogs.some((l) => l.id === h.id && l.date === td);
        return '<div class="list-item"><input type="checkbox" class="custom-check" ' + (d ? 'checked' : '') + ' data-action="toggleHabit" data-habit-id="' + h.id + '" data-date="' + td + '"><div class="item-content"><div class="item-title">' + esc(h.name) + '</div></div></div>';
      }).join('')
    : '<div style="color:var(--text-muted);padding:12px">尚未设置习惯</div>';

  // Recent
  const rec = [...data.tasks].reverse().slice(0, 6);
  qs('#dashRecentList').innerHTML = rec.length
    ? rec.map((t) => {
        const pc = t.priority === 'high' ? 'var(--danger)' : t.priority === 'medium' ? 'var(--warning)' : 'var(--text-muted)';
        return '<div class="list-item" data-action="editTask" data-id="' + t.id + '" style="border-left:4px solid ' + pc + '"><input type="checkbox" class="custom-check" data-action="toggleTask" data-id="' + t.id + '" ' + (t.status === 'done' ? 'checked' : '') + '><div class="item-content"><div class="item-title" style="' + (t.status === 'done' ? 'text-decoration:line-through;opacity:.6' : '') + '">' + esc(t.title) + '</div><div class="item-meta"><span class="badge badge-outline">' + (stL[t.status] || t.status) + '</span></div></div></div>';
      }).join('')
    : '<div style="color:var(--text-muted);padding:12px">暂无待办</div>';
}
