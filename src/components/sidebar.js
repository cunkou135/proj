import { qs, qsa } from '../utils/dom.js';

let currentView = 'dashboard';

export function initSidebar(onViewChange) {
  const overlay = qs('.sidebar-overlay');
  const sidebar = qs('.sidebar');
  const toggle = qs('.sidebar-toggle');

  // Desktop nav items
  qsa('.nav-item').forEach((b) => {
    b.onclick = () => {
      qsa('.nav-item').forEach((x) => x.classList.remove('active'));
      b.classList.add('active');
      const v = b.getAttribute('data-view');
      switchView(v, onViewChange);
      closeSidebar();
    };
  });

  // Mobile toggle
  if (toggle) {
    toggle.onclick = () => {
      sidebar.classList.toggle('open');
      overlay.classList.toggle('active');
    };
  }

  // Overlay click closes sidebar
  if (overlay) {
    overlay.onclick = () => closeSidebar();
  }

  // Bottom nav items
  qsa('.bottom-nav-item').forEach((b) => {
    b.onclick = () => {
      const v = b.getAttribute('data-view');
      // Update both navs
      qsa('.nav-item').forEach((x) => x.classList.remove('active'));
      const sidebarItem = qs(`.nav-item[data-view="${v}"]`);
      if (sidebarItem) sidebarItem.classList.add('active');
      qsa('.bottom-nav-item').forEach((x) => x.classList.remove('active'));
      b.classList.add('active');
      switchView(v, onViewChange);
    };
  });
}

function switchView(v, onViewChange) {
  currentView = v;
  qsa('.view').forEach((x) => x.classList.remove('active'));
  qs('#view-' + v).classList.add('active');
  if (onViewChange) onViewChange();
}

function closeSidebar() {
  const sidebar = qs('.sidebar');
  const overlay = qs('.sidebar-overlay');
  if (sidebar) sidebar.classList.remove('open');
  if (overlay) overlay.classList.remove('active');
}

export function getCurrentView() {
  return currentView;
}
