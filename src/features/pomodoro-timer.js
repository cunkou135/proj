import { qs, toast } from '../utils/dom.js';
import { uuid } from '../utils/id.js';
import { today } from '../utils/date.js';
import { dataService } from '../data/data-service.js';

let pomoState = { status: 'idle', remaining: 25 * 60, timer: null, activeId: null, duration: 25 };

export function getPomoState() {
  return pomoState;
}

export function setDuration(minutes) {
  const m = Math.max(1, Math.min(120, Math.round(Number(minutes) || 25)));
  pomoState.duration = m;
  if (pomoState.status === 'idle') {
    pomoState.remaining = m * 60;
    qs('#pomoDisplay').innerText = m.toString().padStart(2, '0') + ':00';
  }
}

export function totalFocusMinutes(records) {
  return records.reduce((s, r) => s + (r.duration || 25), 0);
}

export function totalPomoCount(records) {
  return records.reduce((s, r) => s + Math.floor((r.duration || 25) / 25), 0);
}

export function selectPomo(id) {
  if (pomoState.status !== 'idle') return toast('请先结束当前专注');
  pomoState.activeId = id;
  const data = dataService.getData();
  const t = data.pomoTasks.find((x) => x.id === id);
  qs('#pomoCurrentTask').innerText = t ? t.title : '';
}

export function startPomo(renderCallbacks) {
  if (!pomoState.activeId) return toast('请先选择任务');
  pomoState.status = 'running';
  qs('#pomoStartBtn').style.display = 'none';
  qs('#pomoStopBtn').style.display = 'inline-flex';
  const durSelector = qs('#pomoDurSelector');
  if (durSelector) durSelector.style.display = 'none';
  pomoState.timer = setInterval(() => {
    pomoState.remaining--;
    const m = Math.floor(pomoState.remaining / 60);
    const s = pomoState.remaining % 60;
    qs('#pomoDisplay').innerText = m.toString().padStart(2, '0') + ':' + s.toString().padStart(2, '0');
    if (pomoState.remaining <= 0) {
      clearInterval(pomoState.timer);
      const record = {
        id: uuid(),
        taskId: pomoState.activeId,
        date: today(),
        duration: pomoState.duration,
        completedAt: new Date().toISOString(),
      };
      dataService.upsert('pomoRecords', record);
      toast('专注完成！已记录');
      pomoState.status = 'idle';
      pomoState.remaining = pomoState.duration * 60;
      qs('#pomoStartBtn').style.display = 'inline-flex';
      qs('#pomoStopBtn').style.display = 'none';
      qs('#pomoDisplay').innerText = pomoState.duration.toString().padStart(2, '0') + ':00';
      const durSel = qs('#pomoDurSelector');
      if (durSel) durSel.style.display = '';
      if (renderCallbacks) renderCallbacks();
    }
  }, 1000);
}

export function stopPomo() {
  clearInterval(pomoState.timer);
  pomoState.status = 'idle';
  pomoState.remaining = pomoState.duration * 60;
  qs('#pomoDisplay').innerText = pomoState.duration.toString().padStart(2, '0') + ':00';
  qs('#pomoStartBtn').style.display = 'inline-flex';
  qs('#pomoStopBtn').style.display = 'none';
  const durSel = qs('#pomoDurSelector');
  if (durSel) durSel.style.display = '';
}
