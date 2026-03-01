import { qs, esc } from '../utils/dom.js';
import { dataService } from '../data/data-service.js';
import { renderWikiLinks, renderBacklinksHTML } from '../features/zettelkasten.js';
import { marked } from 'marked';

export function renderPapers() {
  const data = dataService.getData();
  const f = qs('#paperFilter') ? qs('#paperFilter').value : '';
  let p = data.papers;
  if (f) p = p.filter((x) => x.status === f);
  const sm = { unread: '⚪未读', reading: '🔵在读', 'deep-read': '🟣精读', read: '🟢已读' };
  qs('#paperStats').innerText = '共 ' + data.papers.length + ' 篇 (已读 ' + data.papers.filter((x) => x.status === 'read').length + ')';
  qs('#paperList').innerHTML = p.length
    ? p.map((x) =>
        '<div class="list-item" data-action="editPaper" data-id="' + x.id + '"><div class="item-content"><div class="item-title" style="font-size:1.05rem">' + esc(x.title) + '</div><div class="item-meta"><span class="badge" style="background:var(--bg-hover)">' + (sm[x.status] || x.status) + '</span><span style="color:var(--warning)">' + '★'.repeat(x.rating || 0) + '☆'.repeat(5 - (x.rating || 0)) + '</span><strong style="color:var(--primary)">' + esc(x.source || '') + ' ' + (x.year || '') + '</strong><span>' + esc(x.authors || '') + '</span></div></div>' + (x.url ? '<a href="' + esc(x.url) + '" target="_blank" class="btn-icon" onclick="event.stopPropagation()">🔗</a>' : '') + '<button class="btn-icon" data-action="delPaper" data-id="' + x.id + '">✕</button></div>'
      ).join('')
    : '<div style="color:var(--text-muted);padding:24px;text-align:center">无匹配论文</div>';
}

export function renderMemos() {
  const data = dataService.getData();
  qs('#memoMasonry').innerHTML = data.memos.length
    ? data.memos.map((m) =>
        '<div class="memo-card" data-action="viewMemo" data-id="' + m.id + '"><div style="font-weight:700;font-size:1.1rem;margin-bottom:8px">' + esc(m.title) + '</div><div style="font-size:0.75rem;color:var(--primary);margin-bottom:8px">' + (m.tags || '').split(',').filter((t) => t.trim()).map((t) => '#' + t.trim()).join(' ') + '</div><div class="memo-content-preview">' + esc((m.content || '').replace(/[#*_>]/g, '')) + '</div><div style="display:flex;justify-content:flex-end;margin-top:12px"><button class="btn-icon" data-action="editMemo" data-id="' + m.id + '">✎</button><button class="btn-icon" data-action="delMemo" data-id="' + m.id + '">✕</button></div></div>'
      ).join('')
    : '<div style="color:var(--text-muted);text-align:center;padding:40px">暂无备忘录</div>';
}

export function viewMemoDetail(id) {
  const data = dataService.getData();
  const m = data.memos.find((x) => x.id === id);
  if (!m) return;
  qs('#mdViewTitle').innerText = m.title;
  qs('#mdViewTags').innerHTML = (m.tags || '').split(',').filter((t) => t.trim()).map((t) => '<span class="badge badge-outline" style="color:var(--primary)">#' + t.trim() + '</span>').join('');
  let html = marked.parse(m.content || '');
  qs('#mdViewContent').innerHTML = renderWikiLinks(html);
  qs('#mdViewBacklinks').innerHTML = renderBacklinksHTML('memo', id);
}
