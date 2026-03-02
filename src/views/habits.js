import { qs, esc } from '../utils/dom.js';
import { today } from '../utils/date.js';
import { dataService } from '../data/data-service.js';
import { totalFocusMinutes, totalPomoCount } from '../features/pomodoro-timer.js';

export function renderHabits() {
  const data = dataService.getData();
  const td = today();
  const wk = new Date();
  wk.setDate(wk.getDate() - 7);
  const todayRecs = data.pomoRecords.filter((r) => r.date === td);
  const weekRecs = data.pomoRecords.filter((r) => new Date(r.date) >= wk);
  qs('#habitStatToday').innerText = totalPomoCount(todayRecs);
  qs('#habitStatWeek').innerText = totalPomoCount(weekRecs);
  qs('#habitStatTotal').innerText = totalPomoCount(data.pomoRecords);
  qs('#habitStatHours').innerText = Math.round(totalFocusMinutes(data.pomoRecords) / 60) + 'h';

  renderFocusHeatmap();

  const c = qs('#habitsContainer');
  if (!data.habits.length) {
    c.innerHTML = '<div style="color:var(--text-muted);text-align:center;padding:40px">暂无打卡习惯</div>';
    return;
  }

  const now = new Date();
  const dates = [];
  for (let i = 181; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    dates.push(d.toISOString().split('T')[0]);
  }

  c.innerHTML = data.habits.map((h) => {
    const logs = new Set(data.habitLogs.filter((l) => l.habitId === h.id).map((l) => l.date));
    let streak = 0;
    for (let i = dates.length - 1; i >= 0; i--) {
      if (logs.has(dates[i])) streak++;
      else if (i < dates.length - 1) break;
    }
    const fDow = new Date(dates[0]).getDay();
    const padded = [];
    for (let i = 0; i < fDow; i++) padded.push(null);
    dates.forEach((d) => padded.push(d));
    const nc = Math.ceil(padded.length / 7);
    let gh = '';
    for (let col = 0; col < nc; col++) {
      for (let row = 0; row < 7; row++) {
        const idx = col * 7 + row;
        const ds = idx < padded.length ? padded[idx] : null;
        if (!ds) {
          gh += '<div class="heatmap-cell" style="visibility:hidden"></div>';
        } else {
          const ck = logs.has(ds);
          gh += '<div class="heatmap-cell" style="' + (ck ? 'background:' + h.color : '') + '" data-action="toggleHabit" data-habit-id="' + h.id + '" data-date="' + ds + '"><span class="hm-tooltip">' + ds + (ck ? ' ✓' : '') + '</span></div>';
        }
      }
    }
    const itd = logs.has(dates[dates.length - 1]);
    return '<div class="habit-card"><div class="habit-header"><div style="font-weight:700;font-size:1.1rem;display:flex;align-items:center;gap:8px"><div style="width:14px;height:14px;border-radius:4px;background:' + h.color + '"></div>' + esc(h.name) + '</div><div style="display:flex;gap:12px;align-items:center"><span style="font-size:0.85rem;color:var(--text-muted)">连续:<strong style="color:var(--text-main)">' + streak + '天</strong></span><button class="btn ' + (itd ? 'btn-ghost' : 'btn-primary') + '" data-action="toggleHabit" data-habit-id="' + h.id + '" data-date="' + dates[dates.length - 1] + '">' + (itd ? '取消' : '打卡') + '</button><button class="btn-icon" data-action="delHabit" data-id="' + h.id + '">✕</button></div></div><div style="overflow-x:auto;padding-bottom:8px"><div class="gh-heatmap-grid" style="grid-template-columns:repeat(' + nc + ',13px)">' + gh + '</div></div></div>';
  }).join('');
}

function renderFocusHeatmap() {
  const data = dataService.getData();
  const el = qs('#focusHeatmap');
  if (!el) return;

  const now = new Date();
  const totalDays = 52 * 7;
  const allDates = [];
  for (let i = totalDays - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    allDates.push(d);
  }

  const actMap = {};
  const minMap = {};
  data.pomoRecords.forEach((r) => {
    actMap[r.date] = (actMap[r.date] || 0) + 1;
    minMap[r.date] = (minMap[r.date] || 0) + (r.duration || 25);
  });
  data.habitLogs.forEach((l) => { actMap[l.date] = (actMap[l.date] || 0) + 1; });

  const cells = allDates.map((d) => {
    const ds = d.toISOString().split('T')[0];
    return { date: ds, count: actMap[ds] || 0, minutes: minMap[ds] || 0, dow: d.getDay(), month: d.getMonth(), day: d.getDate() };
  });
  const maxC = Math.max(1, ...cells.map((c) => c.count));
  const lvl = (c) => {
    if (c === 0) return 0;
    if (c <= Math.ceil(maxC * 0.25)) return 1;
    if (c <= Math.ceil(maxC * 0.5)) return 2;
    if (c <= Math.ceil(maxC * 0.75)) return 3;
    return 4;
  };

  const firstDow = allDates[0].getDay();
  const padded = [];
  for (let i = 0; i < firstDow; i++) padded.push(null);
  cells.forEach((c) => padded.push(c));
  const numCols = Math.ceil(padded.length / 7);

  const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
  const monthMarks = [];
  let lastM = -1;
  for (let col = 0; col < numCols; col++) {
    const idx = col * 7;
    const cell = idx < padded.length ? padded[idx] : null;
    if (cell && cell.month !== lastM) {
      monthMarks.push({ col, label: monthNames[cell.month] });
      lastM = cell.month;
    }
  }

  let mHtml = '';
  for (let i = 0; i < monthMarks.length; i++) {
    const nextCol = i < monthMarks.length - 1 ? monthMarks[i + 1].col : numCols;
    const w = (nextCol - monthMarks[i].col) * 16;
    mHtml += '<span style="display:inline-block;width:' + w + 'px;font-size:0.65rem;color:var(--text-muted)">' + monthMarks[i].label + '</span>';
  }

  let gHtml = '';
  for (let col = 0; col < numCols; col++) {
    for (let row = 0; row < 7; row++) {
      const idx = col * 7 + row;
      const c = idx < padded.length ? padded[idx] : null;
      if (!c) {
        gHtml += '<div class="heatmap-cell" style="visibility:hidden"></div>';
      } else {
        const l = lvl(c.count);
        const tip = c.date + ' (' + ['日', '一', '二', '三', '四', '五', '六'][c.dow] + ') — ' + c.count + '次 / ' + c.minutes + 'min';
        gHtml += '<div class="heatmap-cell level-' + l + '"><span class="hm-tooltip">' + tip + '</span></div>';
      }
    }
  }

  const totalMin = cells.reduce((s, c) => s + c.minutes, 0);
  const totalAct = cells.reduce((s, c) => s + c.count, 0);
  qs('#heatmapSummary').innerText = '过去一年共 ' + totalAct + ' 次活动 (' + Math.round(totalMin / 60) + ' 小时)';
  el.innerHTML = '<div style="display:flex;gap:4px"><div style="display:flex;flex-direction:column;gap:3px;padding-top:20px"><span style="height:13px;line-height:13px;font-size:0.6rem;color:var(--text-muted);text-align:right;width:20px"></span><span style="height:13px;line-height:13px;font-size:0.6rem;color:var(--text-muted);text-align:right;width:20px">一</span><span style="height:13px;line-height:13px;font-size:0.6rem;color:var(--text-muted);text-align:right;width:20px"></span><span style="height:13px;line-height:13px;font-size:0.6rem;color:var(--text-muted);text-align:right;width:20px">三</span><span style="height:13px;line-height:13px;font-size:0.6rem;color:var(--text-muted);text-align:right;width:20px"></span><span style="height:13px;line-height:13px;font-size:0.6rem;color:var(--text-muted);text-align:right;width:20px">五</span><span style="height:13px;line-height:13px;font-size:0.6rem;color:var(--text-muted);text-align:right;width:20px"></span></div><div style="flex:1;overflow-x:auto;padding-bottom:8px"><div style="margin-bottom:4px">' + mHtml + '</div><div class="gh-heatmap-grid" style="grid-template-columns:repeat(' + numCols + ',13px)">' + gHtml + '</div></div></div><div style="display:flex;align-items:center;gap:4px;justify-content:flex-end;margin-top:8px;font-size:0.7rem;color:var(--text-muted)"><span>少</span><div style="width:13px;height:13px;border-radius:2px;background:var(--hm-empty)"></div><div style="width:13px;height:13px;border-radius:2px;background:var(--hm-l1)"></div><div style="width:13px;height:13px;border-radius:2px;background:var(--hm-l2)"></div><div style="width:13px;height:13px;border-radius:2px;background:var(--hm-l3)"></div><div style="width:13px;height:13px;border-radius:2px;background:var(--hm-l4)"></div><span>多</span></div>';
}
