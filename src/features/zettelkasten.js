import { qs } from '../utils/dom.js';
import { esc } from '../utils/dom.js';
import { uuid } from '../utils/id.js';
import { dataService } from '../data/data-service.js';

const typeIcon = { paper: '📑', memo: '💡', task: '📋' };
const typeLabel = { paper: '论文', memo: '备忘', task: '任务' };

export { typeIcon, typeLabel };

export function buildTitleIndex() {
  const data = dataService.getData();
  const idx = {};
  data.papers.forEach((p) => {
    idx[p.title.trim().toLowerCase()] = { type: 'paper', id: p.id, title: p.title };
  });
  data.memos.forEach((m) => {
    idx[m.title.trim().toLowerCase()] = { type: 'memo', id: m.id, title: m.title };
  });
  data.tasks.forEach((t) => {
    idx[t.title.trim().toLowerCase()] = { type: 'task', id: t.id, title: t.title };
  });
  return idx;
}

export function extractLinks(text) {
  if (!text) return [];
  const re = /\[\[([^\]]+)\]\]/g;
  const results = [];
  let m;
  while ((m = re.exec(text)) !== null) results.push(m[1].trim());
  return results;
}

export function getEntityText(type, id) {
  const data = dataService.getData();
  if (type === 'paper') {
    const p = data.papers.find((x) => x.id === id);
    return (p ? p.notes : '') || '';
  }
  if (type === 'memo') {
    const m = data.memos.find((x) => x.id === id);
    return (m ? m.content : '') || '';
  }
  if (type === 'task') {
    const t = data.tasks.find((x) => x.id === id);
    return (t ? t.desc : '') || '';
  }
  return '';
}

export function syncLinks(sourceType, sourceId) {
  const data = dataService.getData();
  data.links = data.links.filter((l) => !(l.sourceType === sourceType && l.sourceId === sourceId));
  const text = getEntityText(sourceType, sourceId);
  const titles = extractLinks(text);
  const idx = buildTitleIndex();
  const newLinks = [];
  titles.forEach((title) => {
    const key = title.toLowerCase();
    const target = idx[key];
    if (target && !(target.type === sourceType && target.id === sourceId)) {
      newLinks.push({
        id: uuid(),
        sourceType,
        sourceId,
        targetType: target.type,
        targetId: target.id,
        targetTitle: target.title,
      });
    }
  });
  data.links.push(...newLinks);
  // Persist link changes
  dataService.replaceLinks(sourceType, sourceId, newLinks);
}

export function getBacklinks(type, id) {
  const data = dataService.getData();
  return data.links.filter((l) => l.targetType === type && l.targetId === id);
}

export function cleanLinks(type, id) {
  const data = dataService.getData();
  data.links = data.links.filter(
    (l) => !(l.sourceType === type && l.sourceId === id) && !(l.targetType === type && l.targetId === id),
  );
}

export function getEntityTitle(type, id) {
  const data = dataService.getData();
  if (type === 'paper') {
    const p = data.papers.find((x) => x.id === id);
    return p ? p.title : '?';
  }
  if (type === 'memo') {
    const m = data.memos.find((x) => x.id === id);
    return m ? m.title : '?';
  }
  if (type === 'task') {
    const t = data.tasks.find((x) => x.id === id);
    return t ? t.title : '?';
  }
  return '?';
}

export function renderWikiLinks(html) {
  const idx = buildTitleIndex();
  return html.replace(/\[\[([^\]]+)\]\]/g, function (_, title) {
    const key = title.trim().toLowerCase();
    const target = idx[key];
    if (target) {
      return (
        '<span class="wiki-link" data-entity-type="' +
        target.type +
        '" data-entity-id="' +
        target.id +
        '">' +
        (typeIcon[target.type] || '') +
        ' ' +
        esc(target.title) +
        '</span>'
      );
    }
    return '<span class="wiki-link broken">[[' + esc(title) + ']]</span>';
  });
}

export function renderBacklinksHTML(type, id) {
  const bls = getBacklinks(type, id);
  if (!bls.length) return '';
  let html = '<div class="backlinks-section"><h4>🔗 反向链接 (' + bls.length + ')</h4>';
  bls.forEach((l) => {
    const srcTitle = getEntityTitle(l.sourceType, l.sourceId);
    html +=
      '<div class="backlink-item" data-entity-type="' +
      l.sourceType +
      '" data-entity-id="' +
      l.sourceId +
      '"><span class="bl-type bl-type-' +
      l.sourceType +
      '">' +
      (typeIcon[l.sourceType] || '') +
      ' ' +
      (typeLabel[l.sourceType] || l.sourceType) +
      '</span><span>' +
      esc(srcTitle) +
      '</span></div>';
  });
  html += '</div>';
  return html;
}

// ===== AUTOCOMPLETE SYSTEM =====
let acState = { active: false, items: [], selected: 0, textarea: null, startPos: 0 };

export function getAllEntities() {
  const data = dataService.getData();
  const all = [];
  data.papers.forEach((p) => all.push({ type: 'paper', id: p.id, title: p.title }));
  data.memos.forEach((m) => all.push({ type: 'memo', id: m.id, title: m.title }));
  data.tasks.forEach((t) => all.push({ type: 'task', id: t.id, title: t.title }));
  return all;
}

export function showAutocomplete(textarea) {
  const val = textarea.value;
  const pos = textarea.selectionStart;
  const before = val.substring(0, pos);
  const match = before.match(/\[\[([^\]]*)$/);
  if (!match) {
    hideAutocomplete();
    return;
  }
  const query = match[1].toLowerCase();
  acState.startPos = pos - match[1].length;
  const all = getAllEntities();
  acState.items = query ? all.filter((e) => e.title.toLowerCase().includes(query)) : all;
  acState.items = acState.items.slice(0, 8);
  if (!acState.items.length) {
    hideAutocomplete();
    return;
  }
  acState.active = true;
  acState.selected = 0;
  acState.textarea = textarea;
  const el = qs('#wikiAutocomplete');
  el.innerHTML = acState.items
    .map(
      (e, i) =>
        '<div class="wiki-ac-item' +
        (i === 0 ? ' active' : '') +
        '" data-ac-index="' +
        i +
        '"><span class="ac-type ac-type-' +
        e.type +
        '">' +
        (typeIcon[e.type] || '') +
        ' ' +
        (typeLabel[e.type] || '') +
        '</span><span>' +
        esc(e.title) +
        '</span></div>',
    )
    .join('');
  const rect = textarea.getBoundingClientRect();
  const lineH = parseInt(getComputedStyle(textarea).lineHeight) || 20;
  const lines = before.split('\n');
  el.style.left = Math.min(rect.left + 8, window.innerWidth - 240) + 'px';
  el.style.top = Math.min(rect.top + lines.length * lineH + 4, window.innerHeight - 220) + 'px';
  el.style.display = 'block';
}

export function hideAutocomplete() {
  acState.active = false;
  const el = qs('#wikiAutocomplete');
  if (el) el.style.display = 'none';
}

export function selectAutocompleteItem(index) {
  if (!acState.active || !acState.items[index]) return;
  const e = acState.items[index];
  const ta = acState.textarea;
  const val = ta.value;
  const pos = ta.selectionStart;
  const before = val.substring(0, acState.startPos) + e.title + ']]';
  const after = val.substring(pos);
  ta.value = before + after;
  const newPos = before.length;
  ta.selectionStart = ta.selectionEnd = newPos;
  ta.focus();
  hideAutocomplete();
}

export function handleAcKeydown(e) {
  if (!acState.active) return;
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    acState.selected = Math.min(acState.selected + 1, acState.items.length - 1);
    updateAcHighlight();
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    acState.selected = Math.max(acState.selected - 1, 0);
    updateAcHighlight();
  } else if (e.key === 'Enter' && acState.active && acState.items.length) {
    e.preventDefault();
    selectAutocompleteItem(acState.selected);
  } else if (e.key === 'Escape') {
    hideAutocomplete();
  }
}

function updateAcHighlight() {
  const items = qs('#wikiAutocomplete').querySelectorAll('.wiki-ac-item');
  items.forEach((el, i) => el.classList.toggle('active', i === acState.selected));
}

export function initAutocomplete() {
  ['#memoContent', '#taskDesc', '#paperNotes'].forEach((sel) => {
    const el = qs(sel);
    if (!el) return;
    el.addEventListener('input', () => showAutocomplete(el));
    el.addEventListener('keydown', handleAcKeydown);
    el.addEventListener('blur', () => setTimeout(hideAutocomplete, 200));
  });

  // Delegate autocomplete clicks
  const acEl = qs('#wikiAutocomplete');
  if (acEl) {
    acEl.addEventListener('mousedown', (e) => {
      const item = e.target.closest('.wiki-ac-item');
      if (item) {
        const index = parseInt(item.getAttribute('data-ac-index'));
        selectAutocompleteItem(index);
      }
    });
  }
}
