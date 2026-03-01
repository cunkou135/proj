import { qs, esc } from '../utils/dom.js';
import { dataService } from '../data/data-service.js';

const priL = { low: '低', medium: '中', high: '高' };
const stL = { todo: '待办', 'in-progress': '进行中', done: '已完成' };

let currentCalDate = new Date();

export function renderTasks() {
  const data = dataService.getData();
  const f = qs('#filterStatus') ? qs('#filterStatus').value : '';
  let list = data.tasks;
  if (f) list = list.filter((t) => t.status === f);
  qs('#taskList').innerHTML = list.length
    ? list.map((t) => {
        const ms = data.milestones.find((m) => m.id === t.milestoneId);
        const pc = t.priority === 'high' ? 'var(--danger)' : t.priority === 'medium' ? 'var(--warning)' : 'transparent';
        return '<div class="list-item" style="border-left:4px solid ' + pc + '"><input type="checkbox" class="custom-check" data-action="toggleTask" data-id="' + t.id + '" ' + (t.status === 'done' ? 'checked' : '') + '><div class="item-content" data-action="editTask" data-id="' + t.id + '"><div class="item-title" style="' + (t.status === 'done' ? 'text-decoration:line-through;opacity:.6' : '') + '">' + esc(t.title) + '</div>' + (t.desc ? '<div style="font-size:0.8rem;color:var(--text-muted);margin-top:2px">' + esc(t.desc).substring(0, 80) + '</div>' : '') + '<div class="item-meta"><span class="badge badge-outline">' + (stL[t.status] || t.status) + '</span><span style="color:' + (pc === 'transparent' ? 'var(--text-muted)' : pc) + '">' + (priL[t.priority] || '') + '</span>' + (t.deadline ? '<span class="badge badge-outline">DDL:' + t.deadline + '</span>' : '') + (ms ? '<span style="color:var(--primary);font-size:0.75rem">⛳ ' + esc(ms.name) + '</span>' : '') + '</div></div><button class="btn-icon" data-action="delTask" data-id="' + t.id + '">✕</button></div>';
      }).join('')
    : '<div style="color:var(--text-muted);padding:24px;text-align:center">暂无待办</div>';
}

export function renderTopo() {
  const data = dataService.getData();
  const idMap = Object.fromEntries(data.tasks.map((t) => [t.id, t]));
  const gd = (id, v = new Set()) => {
    if (v.has(id)) return 0;
    v.add(id);
    const t = idMap[id];
    if (!t || !t.deps || !t.deps.length) return 0;
    return 1 + Math.max(...t.deps.map((d) => gd(d, v)));
  };
  const levels = {};
  data.tasks.forEach((t) => {
    const d = gd(t.id);
    if (!levels[d]) levels[d] = [];
    levels[d].push(t);
  });
  const sd = Object.keys(levels).map(Number).sort((a, b) => a - b);
  qs('#topoGraph').innerHTML = sd.length
    ? sd.map((d) => {
        const tl = levels[d].map((t) => {
          const bl = (t.deps || []).some((di) => idMap[di] && idMap[di].status !== 'done');
          const sc = t.status === 'done' ? 'done' : bl ? 'blocked' : '';
          const dn = (t.deps || []).map((di) => idMap[di] ? '<span style="color:var(--primary);cursor:pointer" data-action="editTask" data-id="' + di + '">[' + esc(idMap[di].title) + ']</span>' : '').join(' ');
          return '<div class="topo-card ' + sc + '" data-action="editTask" data-id="' + t.id + '"><div style="font-weight:700;margin-bottom:4px">' + esc(t.title) + '</div><div style="font-size:0.75rem;color:var(--text-muted)">状态:' + (stL[t.status] || t.status) + (bl ? ' <span style="color:var(--danger)">(被阻塞)</span>' : '') + '</div>' + (dn ? '<div style="font-size:0.75rem;margin-top:8px;border-top:1px solid var(--border-color);padding-top:4px">依赖:' + dn + '</div>' : '') + '</div>';
        }).join('');
        return '<div class="topo-level"><div class="topo-level-title">' + (d === 0 ? '独立/根任务' : '第' + d + '层依赖') + '</div>' + tl + '</div>';
      }).join('')
    : '<div style="color:var(--text-muted)">无任务数据</div>';
}

export function renderCal() {
  const data = dataService.getData();
  const y = currentCalDate.getFullYear();
  const m = currentCalDate.getMonth();
  qs('#calMonthTitle').innerText = y + '年 ' + (m + 1) + '月';
  const fd = new Date(y, m, 1).getDay();
  const dim = new Date(y, m + 1, 0).getDate();
  const todayStr = new Date().toISOString().split('T')[0];

  const pomoCnt = {};
  data.pomoRecords.forEach((r) => {
    if (r.date && r.date.startsWith(y + '-' + (m + 1).toString().padStart(2, '0')))
      pomoCnt[r.date] = (pomoCnt[r.date] || 0) + 1;
  });
  const focusLevel = (cnt) => {
    const min = cnt * 25;
    if (min === 0) return 0;
    if (min <= 25) return 1;
    if (min <= 75) return 2;
    if (min <= 125) return 3;
    return 4;
  };

  let html = '';
  for (let i = 0; i < fd; i++) html += '<div class="cal-cell" style="background:transparent;border:none"></div>';
  for (let i = 1; i <= dim; i++) {
    const ds = y + '-' + (m + 1).toString().padStart(2, '0') + '-' + i.toString().padStart(2, '0');
    const isToday = ds === todayStr;
    const dt = data.tasks.filter((t) => t.deadline === ds);
    const pc = pomoCnt[ds] || 0;
    const fl = focusLevel(pc);
    const hmCls = fl ? 'hm-' + fl : '';
    const tasksH = dt.map((t) => '<div class="cal-task" style="background:' + (t.status === 'done' ? 'var(--success)' : t.priority === 'high' ? 'var(--danger)' : 'var(--primary)') + '" data-action="editTask" data-id="' + t.id + '">' + esc(t.title) + '</div>').join('');
    const focusBadge = pc ? '<div class="cal-focus-badge">' + pc + '🍅 ' + pc * 25 + 'm</div>' : '';
    html += '<div class="cal-cell ' + hmCls + '"><div class="cal-date ' + (isToday ? 'today' : '') + '">' + i + '</div>' + tasksH + focusBadge + '</div>';
  }
  qs('#calBody').innerHTML = html;
}

export function changeMonth(v) {
  currentCalDate.setMonth(currentCalDate.getMonth() + v);
  renderCal();
}

export function populateTaskOptions() {
  const data = dataService.getData();
  const eid = qs('#taskId').value;
  qs('#taskDependsOn').innerHTML = data.tasks.filter((t) => t.id !== eid).map((t) => '<option value="' + t.id + '">' + esc(t.title) + '</option>').join('');
  qs('#taskMilestone').innerHTML = '<option value="">-- 无 --</option>' + data.milestones.map((m) => '<option value="' + m.id + '">' + esc(m.name) + '</option>').join('');
}
