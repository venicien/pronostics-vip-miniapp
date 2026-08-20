// Configure ici l'URL de ton backend Render une fois déployé.
export const API_BASE_URL = window.__API_BASE_URL__ || 'https://ton-backend.onrender.com';
const SESSION_KEY = 'pvip_session_token';

function getInitData() {
  return window.Telegram?.WebApp?.initData || '';
}

export function getSessionToken() {
  return localStorage.getItem(SESSION_KEY) || '';
}

export function setSessionToken(token) {
  localStorage.setItem(SESSION_KEY, token);
}

export function clearSessionToken() {
  localStorage.removeItem(SESSION_KEY);
}

// Vrai seulement si on est réellement ouvert depuis l'app Telegram (initData
// présent). Sert à décider si on doit proposer le bouton de connexion de
// repli (Telegram Login Widget) sur la page Profil.
export function isInsideTelegram() {
  return Boolean(getInitData());
}

async function request(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const initData = getInitData();
    if (initData) {
      headers['X-Telegram-Init-Data'] = initData;
    } else {
      const token = getSessionToken();
      if (token) headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.details ? `${data.error} — ${data.details}` : data.error || `Erreur ${res.status}`);
  return data;
}

export const api = {
  getMe: () => request('/api/users/me'),
  getWalletTransactions: () => request('/api/users/wallet/transactions'),
  loginWithTelegramWidget: (payload) => request('/api/auth/telegram-login', { method: 'POST', body: payload, auth: false }),
  loginWithCode: (code) => request('/api/auth/code-login', { method: 'POST', body: { code }, auth: false }),

  getContent: (type) => request(`/api/content${type ? `?type=${type}` : ''}`, { auth: false }),

  getVipPasses: () => request('/api/payments/vip-passes', { auth: false }),
  submitMobileMoney: (payload) => request('/api/payments/mobile-money', { method: 'POST', body: payload }),
  submitManualCrypto: (payload) => request('/api/payments/crypto/manual', { method: 'POST', body: payload }),
  initiateNowPayments: (payload) => request('/api/payments/crypto/nowpayments/initiate', { method: 'POST', body: payload }),
  initiateCryptomus: (payload) => request('/api/payments/crypto/cryptomus/initiate', { method: 'POST', body: payload }),
  initiateWalletPay: (payload) => request('/api/payments/crypto/wallet-pay/initiate', { method: 'POST', body: payload }),
  createPaypalOrder: (payload) => request('/api/payments/paypal/create-order', { method: 'POST', body: payload }),

  getActiveBanner: () => request('/api/public/banner-active', { auth: false }),
  getBookmakers: () => request('/api/public/bookmakers', { auth: false }),
  getSettings: () => request('/api/public/settings', { auth: false }),
  getFaq: () => request('/api/public/faq', { auth: false }),
  getStats: () => request('/api/public/stats', { auth: false }),
  getHistory: () => request('/api/public/history?limit=20', { auth: false }),
};
