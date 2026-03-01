import { qs, esc } from '../utils/dom.js';
import { today } from '../utils/date.js';
import { dataService } from '../data/data-service.js';

export function renderMilestones() {
  const data = dataService.getData();
  const list = [...data.milestones].sort((a, b) => new Date(a.endDate) - new Date(b.endDate));
  const sm = { pending: '计划中', 'in-progress': '进行中', done: '已完成' };
  qs('#milestoneTimeline').innerHTML = list.length
    ? list.map((m) => {
        const s = new Date(m.startDate).getTime();
        const e = new Date(m.endDate).getTime();
        const n = Date.now();
        let tp = 0;
        if (s && e && e > s) tp = n > s ? Math.min(100, Math.max(0, ((n - s) / (e - s)) * 100)) : 0;
        const lt = data.tasks.filter((t) => t.milestoneId === m.id);
        const dt = lt.filter((t) => t.status === 'done').length;
        const tprog = lt.length ? Math.round((dt / lt.length) * 100) : m.status === 'done' ? 100 : 0;
        let od = '';
        if (m.status !== 'done' && e && n > e) {
          const days = Math.floor((n - e) / 864e5);
          od = '<span style="color:var(--danger);font-weight:700;margin-left:8px">已超期' + days + '天</span>';
        }
        return '<div class="timeline-item"><div class="timeline-marker" style="background:' + m.color + '"></div><div class="timeline-content"><div style="display:flex;justify-content:space-between;margin-bottom:8px"><h3 style="font-size:1.1rem;color:' + m.color + '">' + esc(m.name) + '</h3><div><button class="btn-icon" data-action="editMilestone" data-id="' + m.id + '">✎</button><button class="btn-icon" data-action="delMilestone" data-id="' + m.id + '">✕</button></div></div><div style="font-size:0.85rem;color:var(--text-muted);margin-bottom:12px">' + esc(m.desc || '') + '</div><div style="font-size:0.8rem;font-weight:600;margin-bottom:20px"><span class="badge badge-outline">' + (sm[m.status] || m.status) + '</span><span style="margin-left:12px">' + m.startDate + ' ➔ ' + m.endDate + '</span>' + od + '</div><div style="margin-bottom:12px"><div style="display:flex;justify-content:space-between;font-size:0.75rem;color:var(--text-muted);margin-bottom:4px"><span><strong style="color:var(--text-main)">任务完成度</strong>: ' + dt + '/' + lt.length + '</span><span style="font-weight:700;color:var(--text-main)">' + tprog + '%</span></div><div class="progress-bar-bg" style="height:8px;margin:0"><div class="progress-bar-fill" style="width:' + tprog + '%;background:' + m.color + '"></div></div></div><div><div style="display:flex;justify-content:space-between;font-size:0.75rem;color:var(--text-muted);margin-bottom:4px"><span>时间进度</span><span>' + Math.round(tp) + '%</span></div><div class="progress-bar-bg" style="height:4px;margin:0;opacity:.6"><div class="progress-bar-fill" style="width:' + tp + '%;background:var(--text-muted)"></div></div></div>' + buildMiniCal(m, lt) + '</div></div>';
      }).join('')
    : '<div style="color:var(--text-muted);text-align:center;padding:40px">点击「设立里程碑」开始</div>';
}

function buildMiniCal(ms, lt) {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const fd = new Date(y, m, 1).getDay();
  const dim = new Date(y, m + 1, 0).getDate();
  const todayStr = today();
  const ddls = new Set(lt.filter((t) => t.deadline).map((t) => t.deadline));
  const dh = ['日', '一', '二', '三', '四', '五', '六'];
  let hh = dh.map((d) => '<div class="ms-cal-dh">' + d + '</div>').join('');
  let ch = '';
  for (let i = 0; i < fd; i++) ch += '<div class="ms-cal-d"></div>';
  for (let i = 1; i <= dim; i++) {
    const ds = y + '-' + (m + 1).toString().padStart(2, '0') + '-' + i.toString().padStart(2, '0');
    let cl = 'ms-cal-d';
    if (ds === todayStr) cl += ' is-today';
    if (ms.startDate && ms.endDate && ds >= ms.startDate && ds <= ms.endDate) cl += ' in-range';
    if (ddls.has(ds)) cl += ' has-task';
    ch += '<div class="' + cl + '">' + i + '</div>';
  }
  const mn = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
  return '<div class="ms-cal"><div class="ms-cal-header"><span>📅 ' + y + '年' + mn[m] + '</span><span style="font-size:0.7rem;color:var(--text-muted)">' + (ms.startDate && ms.endDate ? '<span style="background:var(--primary-light);padding:2px 6px;border-radius:4px">里程碑区间</span>' : '') + (lt.length ? ' <span style="color:var(--danger)">● 任务截止</span>' : '') + '</span></div><div class="ms-cal-grid">' + hh + ch + '</div></div>';
}
