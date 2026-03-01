export const qs = (s) => document.querySelector(s);
export const qsa = (s) => document.querySelectorAll(s);

export function esc(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

export function toast(msg) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.innerText = msg;
  qs('#toast-container').appendChild(t);
  setTimeout(() => {
    t.style.opacity = 0;
    setTimeout(() => t.remove(), 300);
  }, 3000);
}
