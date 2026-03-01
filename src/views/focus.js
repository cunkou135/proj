import { qs, esc } from '../utils/dom.js';
import { today } from '../utils/date.js';
import { dataService } from '../data/data-service.js';
import { getPomoState } from '../features/pomodoro-timer.js';

export function renderPomo() {
  const data = dataService.getData();
  const pomoState = getPomoState();
  qs('#pomoTaskList').innerHTML = data.pomoTasks.length
    ? data.pomoTasks.map((t) =>
        '<div class="list-item" style="border-left:4px solid ' + (pomoState.activeId === t.id ? 'var(--primary)' : 'transparent') + '" data-action="selectPomo" data-id="' + t.id + '"><div class="item-content"><div class="item-title">' + esc(t.title) + '</div></div><button class="btn-icon" data-action="delPomo" data-id="' + t.id + '">✕</button></div>'
      ).join('')
    : '<div style="color:var(--text-muted);padding:12px;text-align:center">暂无</div>';

  const td = today();
  const tp = data.pomoRecords.filter((r) => r.date === td);
  qs('#pomoTodayStats').innerHTML = tp.length
    ? '<div style="font-size:1.5rem;font-weight:800;color:var(--primary)">' + tp.length + '</div><div>个番茄 (' + tp.length * 25 + ' 分钟)</div>'
    : '今日暂无记录';
}
