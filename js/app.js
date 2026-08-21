import { renderHome } from './views/home.js';
import { renderVip } from './views/vip.js';
import { renderBonus } from './views/bonus.js';
import { renderProfile } from './views/profile.js';
import { api } from './api.js';

const routes = {
  home: { render: renderHome, label: 'Accueil', icon: '🎟️' },
  vip: { render: renderVip, label: 'VIP', icon: '⭐' },
  bonus: { render: renderBonus, label: 'Bonus', icon: '🎁' },
  profile: { render: renderProfile, label: 'Profil', icon: '👤' },
};

function initTelegram() {
  const tg = window.Telegram?.WebApp;
  if (!tg) return;
  tg.ready();
  tg.expand();
  document.documentElement.style.setProperty('--tg-viewport-height', `${tg.viewportHeight}px`);
}

async function mountBrandHeader(root) {
  try {
    const { settings } = await api.getSettings();
    const logoUrl = settings?.logo_url;
    if (logoUrl) {
      const header = document.createElement('div');
      header.style.cssText = 'display:flex;justify-content:center;padding:10px 0 0;';
      header.innerHTML = `<img src="${logoUrl}" alt="Logo" style="height:32px;" />`;
      root.prepend(header);
    }
  } catch (e) {
    // pas bloquant si les réglages ne chargent pas
  }
}

async function mountBanner(root) {
  try {
    const { banner } = await api.getActiveBanner();
    if (banner?.is_active) {
      const el = document.createElement('div');
      el.className = 'banner-flash';
      el.textContent = banner.message;
      root.prepend(el);
    }
  } catch (e) {
    // pas bloquant si la bannière ne charge pas
  }
}

function mountNav(root, activeRoute, viewContainer) {
  const nav = document.createElement('nav');
  nav.className = 'bottom-nav';
  nav.innerHTML = Object.entries(routes)
    .map(
      ([key, r]) => `
      <button data-route="${key}" class="${key === activeRoute ? 'active' : ''}">
        <span aria-hidden="true">${r.icon}</span>
        <span>${r.label}</span>
      </button>`
    )
    .join('');

  nav.querySelectorAll('button').forEach((btn) => {
    btn.addEventListener('click', () => navigate(btn.dataset.route, root, viewContainer));
  });

  const existing = root.querySelector('.bottom-nav');
  if (existing) existing.remove();
  root.appendChild(nav);
}

function navigate(routeKey, root, viewContainer) {
  window.location.hash = routeKey;
  routes[routeKey].render(viewContainer);
  mountNav(root, routeKey, viewContainer);
}

function showToast(message, type = 'error') {
  const existing = document.getElementById('global-toast');
  if (existing) existing.remove();
  
  const toast = document.createElement('div');
  toast.id = 'global-toast';
  toast.style.cssText = `
    position: fixed;
    top: 16px;
    left: 50%;
    transform: translateX(-50%);
    background: ${type === 'error' ? 'var(--red)' : 'var(--green)'};
    color: #fff;
    padding: 10px 16px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 600;
    z-index: 9999;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    max-width: 90%;
    text-align: center;
    animation: slideDown 0.3s ease forwards;
  `;
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'slideUp 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Intercepter les erreurs globales (réseau, promesses non gérées)
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled Rejection:', event.reason);
    showToast(event.reason?.message || "Une erreur inattendue est survenue.");
  });
}

function boot() {
  initTelegram();

  const root = document.getElementById('app');
  const viewContainer = document.createElement('div');
  viewContainer.id = 'view-container';
  root.appendChild(viewContainer);

  mountBrandHeader(root);
  mountBanner(root);

  const initialRoute = window.location.hash.replace('#', '') || 'home';
  navigate(routes[initialRoute] ? initialRoute : 'home', root, viewContainer);
}

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', boot);
}
