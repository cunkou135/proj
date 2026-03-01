export function initTheme() {
  const saved = localStorage.getItem('tf_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
}

export function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('tf_theme', next);
}
