import { qs, esc } from '../utils/dom.js';
import { dataService } from '../data/data-service.js';
import { typeIcon } from './zettelkasten.js';

export function renderGraph() {
  const data = dataService.getData();
  const container = qs('#graphContainer');
  const svg = qs('#graphSvg');
  const nodesEl = qs('#graphNodes');
  if (!container || !svg || !nodesEl) return;
  const filter = qs('#graphFilter') ? qs('#graphFilter').value : '';

  let nodes = [];
  if (!filter || filter === 'paper')
    data.papers.forEach((p) => nodes.push({ id: 'paper-' + p.id, type: 'paper', entityId: p.id, title: p.title }));
  if (!filter || filter === 'memo')
    data.memos.forEach((m) => nodes.push({ id: 'memo-' + m.id, type: 'memo', entityId: m.id, title: m.title }));
  if (!filter || filter === 'task')
    data.tasks.forEach((t) => nodes.push({ id: 'task-' + t.id, type: 'task', entityId: t.id, title: t.title }));

  let edges = [];
  data.links.forEach((l) => {
    const sid = l.sourceType + '-' + l.sourceId;
    const tid = l.targetType + '-' + l.targetId;
    if (nodes.find((n) => n.id === sid) && nodes.find((n) => n.id === tid)) edges.push({ from: sid, to: tid });
  });
  data.tasks.forEach((t) => {
    (t.deps || []).forEach((d) => {
      const sid = 'task-' + t.id;
      const tid = 'task-' + d;
      if (nodes.find((n) => n.id === sid) && nodes.find((n) => n.id === tid)) edges.push({ from: sid, to: tid });
    });
  });

  if (!nodes.length) {
    nodesEl.innerHTML =
      '<div style="color:var(--text-muted);text-align:center;padding:60px">暂无数据节点</div>';
    svg.innerHTML = '';
    return;
  }

  const connected = new Set();
  edges.forEach((e) => {
    connected.add(e.from);
    connected.add(e.to);
  });

  const W = container.clientWidth || 700;
  const H = container.clientHeight || 500;
  const pos = {};
  nodes.forEach((n, i) => {
    pos[n.id] = {
      x: W / 2 + Math.cos(i * 2.4) * W * 0.3 + Math.random() * 40,
      y: H / 2 + Math.sin(i * 2.4) * H * 0.3 + Math.random() * 40,
    };
  });

  for (let iter = 0; iter < 80; iter++) {
    const forces = {};
    nodes.forEach((n) => {
      forces[n.id] = { x: 0, y: 0 };
    });
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i];
        const b = nodes[j];
        const dx = pos[a.id].x - pos[b.id].x;
        const dy = pos[a.id].y - pos[b.id].y;
        const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
        const f = 800 / (dist * dist);
        forces[a.id].x += (dx / dist) * f;
        forces[a.id].y += (dy / dist) * f;
        forces[b.id].x -= (dx / dist) * f;
        forces[b.id].y -= (dy / dist) * f;
      }
    }
    edges.forEach((e) => {
      const dx = pos[e.to].x - pos[e.from].x;
      const dy = pos[e.to].y - pos[e.from].y;
      const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
      const f = (dist - 120) * 0.05;
      forces[e.from].x += (dx / dist) * f;
      forces[e.from].y += (dy / dist) * f;
      forces[e.to].x -= (dx / dist) * f;
      forces[e.to].y -= (dy / dist) * f;
    });
    nodes.forEach((n) => {
      forces[n.id].x += (W / 2 - pos[n.id].x) * 0.01;
      forces[n.id].y += (H / 2 - pos[n.id].y) * 0.01;
    });
    const damp = 0.3;
    nodes.forEach((n) => {
      pos[n.id].x = Math.max(50, Math.min(W - 50, pos[n.id].x + forces[n.id].x * damp));
      pos[n.id].y = Math.max(30, Math.min(H - 30, pos[n.id].y + forces[n.id].y * damp));
    });
  }

  svg.innerHTML = edges
    .map((e) => {
      const p1 = pos[e.from];
      const p2 = pos[e.to];
      return (
        '<line x1="' + p1.x + '" y1="' + p1.y + '" x2="' + p2.x + '" y2="' + p2.y +
        '" stroke="var(--border-color)" stroke-width="1.5" opacity="0.6"/>'
      );
    })
    .join('');

  nodesEl.innerHTML = nodes
    .map((n) => {
      const p = pos[n.id];
      const iso = !connected.has(n.id);
      const shortTitle = n.title.length > 16 ? n.title.substring(0, 15) + '…' : n.title;
      return (
        '<div class="graph-node type-' + n.type + (iso ? ' isolated' : '') +
        '" style="left:' + (p.x - 40) + 'px;top:' + (p.y - 14) + 'px" data-entity-type="' +
        n.type + '" data-entity-id="' + n.entityId + '" title="' + esc(n.title) + '">' +
        (typeIcon[n.type] || '') + ' ' + esc(shortTitle) + '</div>'
      );
    })
    .join('');
}
