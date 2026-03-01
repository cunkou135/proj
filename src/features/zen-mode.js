import { qsa, qs } from '../utils/dom.js';

function zenKeyHandler(e) {
  if (e.key === 'Escape') exitZen();
}

export function enterZen() {
  document.body.classList.add('zen-mode');
  qsa('.view').forEach((x) => x.classList.remove('active'));
  qs('#view-focus').classList.add('active');
  document.addEventListener('keydown', zenKeyHandler);
}

export function exitZen() {
  document.body.classList.remove('zen-mode');
  document.removeEventListener('keydown', zenKeyHandler);
}
