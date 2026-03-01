import { qs } from '../utils/dom.js';

export function renderHeader(user) {
  const headerLeft = qs('.header-left');
  const headerRight = qs('.header-right');

  if (user && headerRight) {
    // Add user info to header
    const userInfo = headerRight.querySelector('.user-info');
    if (userInfo) {
      const avatarUrl = user.user_metadata?.avatar_url || '';
      const name = user.user_metadata?.user_name || user.email || '';
      userInfo.innerHTML = `
        ${avatarUrl ? `<img class="user-avatar" src="${avatarUrl}" alt="avatar">` : ''}
        <span class="user-name">${name}</span>
        <button class="btn btn-ghost btn-logout" id="logoutBtn">退出</button>
      `;
    }
  }
}
