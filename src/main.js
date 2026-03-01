import './styles/tokens.css';
import './styles/base.css';
import './styles/layout.css';
import './styles/components.css';
import './styles/views.css';
import './styles/responsive.css';

import { initTheme } from './components/theme.js';
import { dataService } from './data/data-service.js';
import { getSession, onAuthStateChange } from './auth/auth-service.js';
import { renderLoginPage, hideLoginPage } from './auth/auth-ui.js';
import { migrateLocalDataIfNeeded } from './data/migration.js';
import { initApp } from './app.js';

initTheme();

async function boot() {
  const session = await getSession();
  if (session) {
    await startApp(session.user);
  } else {
    renderLoginPage();
  }
}

async function startApp(user) {
  hideLoginPage();
  await migrateLocalDataIfNeeded(user.id);
  await dataService.init(user.id);
  initApp(user);
}

onAuthStateChange(async (event, session) => {
  if (event === 'SIGNED_IN' && session) {
    await startApp(session.user);
  } else if (event === 'SIGNED_OUT') {
    dataService.teardown();
    renderLoginPage();
  }
});

boot();
