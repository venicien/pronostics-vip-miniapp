import { api, isInsideTelegram, getSessionToken, setSessionToken, clearSessionToken } from '../api.js';

function formatDate(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
}

function daysRemaining(iso) {
  if (!iso) return null;
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000));
}

function openVipRoute() {
  document.querySelector('.bottom-nav button[data-route="vip"]')?.click();
}

function vipJourneyHtml(user) {
  if (!user.isVip) {
    return `
      <section class="profile-onboarding">
        <div class="profile-onboarding__eyebrow">Bien démarrer</div>
        <h2>Ton accès VIP en 3 étapes</h2>
        <div class="onboarding-step"><b>1</b><span><strong>Choisis une durée</strong><small>Flash, découverte, mensuel ou longue durée.</small></span></div>
        <div class="onboarding-step"><b>2</b><span><strong>Paie manuellement</strong><small>Envoie le montant puis transmets ton ID ou hash.</small></span></div>
        <div class="onboarding-step"><b>3</b><span><strong>Attends la validation</strong><small>L'administrateur confirme avant d'activer ton accès.</small></span></div>
        <button class="btn-primary" id="profile-start-vip" type="button">Voir les offres VIP</button>
      </section>
    `;
  }

  if (!user.vipExpiresAt) {
    return `<div class="profile-notice profile-notice--success">Ton accès VIP est permanent. Aucun renouvellement automatique n'est activé.</div>`;
  }

  const remaining = daysRemaining(user.vipExpiresAt);
  const urgency = remaining <= 7 ? 'profile-notice--warning' : 'profile-notice--success';
  const label = remaining <= 7 ? 'Renouveler maintenant' : 'Prolonger mon accès';
  return `
    <section class="profile-notice ${urgency}">
      <strong>${remaining === 0 ? 'Ton accès arrive à échéance.' : `Il te reste ${remaining} jour${remaining > 1 ? 's' : ''} de VIP.`}</strong>
      <p>Un renouvellement avant l'échéance s'ajoute à ta durée restante : tu ne perds pas les jours déjà acquis.</p>
      <button class="btn-primary" id="profile-renew-vip" type="button">${label}</button>
    </section>
  `;
}

// Rendu du bouton officiel "Se connecter avec Telegram" (Login Widget).
// N'apparaît que quand la Mini App est ouverte hors de l'app Telegram (pas
// de initData) et qu'aucune session valide n'est déjà stockée. La signature
// est vérifiée côté serveur (verifyTelegramLoginWidget) : on ne fait jamais
// confiance à ces données côté client.
function renderLoginWidget(container, onSuccess) {
  const botUsername = window.__BOT_USERNAME__;
  container.innerHTML = `
    <div class="empty-state" style="padding-top:40px;">
      Ouvre l'app depuis Telegram pour un accès automatique,<br>
      ou connecte-toi ici :
    </div>
    <div id="tg-login-widget" style="display:flex;justify-content:center;margin-top:16px;"></div>

    <div style="text-align:center;margin:20px 0;color:var(--text-muted);font-size:12px;">— ou —</div>

    <div style="max-width:280px;margin:0 auto;">
      <p style="font-size:13px;color:var(--text-muted);text-align:center;margin-bottom:12px;">
        Envoie <span class="mono" style="color:var(--gold);">/login</span> à notre bot Telegram, il te donne un code à 6 chiffres. Colle-le ici :
      </p>
      <div style="display:flex;gap:8px;">
        <input id="login-code-input" type="text" inputmode="numeric" maxlength="6" placeholder="123456"
          style="flex:1;background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:10px 12px;color:#fff;font-family:var(--font-mono);font-size:16px;text-align:center;letter-spacing:0.1em;" />
        <button id="login-code-submit" class="btn-primary" style="width:auto;padding:0 18px;">Valider</button>
      </div>
      <div id="login-code-error" style="color:var(--red);font-size:12px;margin-top:8px;text-align:center;"></div>
      ${botUsername && botUsername !== 'TonBot_bot' ? `<div style="text-align:center;margin-top:14px;"><a href="https://t.me/${botUsername}?start=login" style="color:var(--gold);font-size:12px;" target="_blank">Ouvrir le bot →</a></div>` : ''}
    </div>
  `;

  const codeInput = container.querySelector('#login-code-input');
  const codeError = container.querySelector('#login-code-error');
  const submitCode = async () => {
    const code = codeInput.value.trim();
    if (!/^\d{6}$/.test(code)) {
      codeError.textContent = 'Le code doit contenir 6 chiffres.';
      return;
    }
    codeError.textContent = '';
    try {
      const { token } = await api.loginWithCode(code);
      setSessionToken(token);
      onSuccess();
    } catch (e) {
      codeError.textContent = e.message;
    }
  };
  container.querySelector('#login-code-submit').addEventListener('click', submitCode);
  codeInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') submitCode();
  });

  if (!botUsername || botUsername === 'TonBot_bot') {
    container.querySelector('#tg-login-widget').innerHTML =
      `<div style="font-size:11px;color:var(--text-muted);text-align:center;">(Widget non configuré — utilise le code ci-dessous)</div>`;
    return;
  }

  window.onTelegramAuth = async (tgUser) => {
    try {
      const { token } = await api.loginWithTelegramWidget(tgUser);
      setSessionToken(token);
      onSuccess();
    } catch (e) {
      container.querySelector('#tg-login-widget').insertAdjacentHTML(
        'beforeend',
        `<div style="color:var(--red);font-size:12px;margin-top:8px;">${e.message}</div>`
      );
    }
  };

  const script = document.createElement('script');
  script.src = 'https://telegram.org/js/telegram-widget.js?22';
  script.setAttribute('data-telegram-login', botUsername);
  script.setAttribute('data-size', 'large');
  script.setAttribute('data-radius', '10');
  script.setAttribute('data-onauth', 'onTelegramAuth(user)');
  script.setAttribute('data-request-access', 'write');
  container.querySelector('#tg-login-widget').appendChild(script);
}

export async function renderProfile(container) {
  container.innerHTML = `
    <div class="topbar">
      <div class="eyebrow">Ton compte</div>
      <h1>Profil</h1>
    </div>
    <div class="view" id="profile-content">
      <div class="skeleton"></div>
    </div>
  `;

  const content = container.querySelector('#profile-content');

  // Hors de l'app Telegram et sans session déjà stockée : on propose direct
  // le bouton de connexion plutôt que d'afficher une erreur 401.
  if (!isInsideTelegram() && !getSessionToken()) {
    renderLoginWidget(content, () => renderProfile(container));
    return;
  }

  try {
    const { user } = await api.getMe();

    content.innerHTML = `
      <div class="wallet-hero">
        <div class="wallet-hero__label">Statut</div>
        <div class="wallet-hero__amount" style="font-size:22px;">
          ${user.isVip ? `⭐ VIP actif` : '🔓 Standard'}
        </div>
        ${user.isVip && user.vipExpiresAt ? `<div style="color:var(--text-muted);font-size:12px;margin-top:6px;">Expire le ${formatDate(user.vipExpiresAt)}</div>` : ''}
        ${user.isVip && !user.vipExpiresAt ? `<div style="color:var(--text-muted);font-size:12px;margin-top:6px;">Accès à vie</div>` : ''}
      </div>

      ${vipJourneyHtml(user)}

      <div class="wallet-hero">
        <div class="wallet-hero__label">Portefeuille</div>
        <div class="wallet-hero__amount">${Number(user.walletBalance).toLocaleString('fr-FR')} XAF</div>
      </div>

      <div class="section-title">Ton lien de parrainage (${user.referralCount} filleul${user.referralCount > 1 ? 's' : ''})</div>
      <div class="referral-link-box" id="ref-link">${user.referralLink}</div>
      <button class="btn-primary" id="copy-ref">Copier le lien</button>

      <div class="section-title">Historique du portefeuille</div>
      <div id="wallet-tx"><div class="skeleton" style="height:60px;"></div></div>

      <div style="text-align:center;margin-top:24px;font-size:11px;color:var(--text-muted);">
        <a href="/legal/mentions-legales.html" target="_blank">Mentions légales</a> ·
        <a href="/legal/cgu.html" target="_blank">CGU</a> ·
        <a href="/legal/confidentialite.html" target="_blank">Confidentialité</a>
      </div>
    `;

    content.querySelector('#profile-start-vip')?.addEventListener('click', openVipRoute);
    content.querySelector('#profile-renew-vip')?.addEventListener('click', openVipRoute);

    content.querySelector('#copy-ref').addEventListener('click', () => {
      navigator.clipboard?.writeText(user.referralLink);
      const btn = content.querySelector('#copy-ref');
      btn.textContent = 'Copié ✅';
      setTimeout(() => (btn.textContent = 'Copier le lien'), 1500);
    });

    const { transactions } = await api.getWalletTransactions();
    const txContainer = content.querySelector('#wallet-tx');
    txContainer.innerHTML = transactions.length
      ? transactions
          .map(
            (tx) => `
        <div class="bookmaker-row">
          <div>
            <div class="bookmaker-row__name">${tx.note || tx.type}</div>
            <div style="font-size:11px;color:var(--text-muted);">${formatDate(tx.created_at)}</div>
          </div>
          <div class="mono" style="color:${tx.type === 'debit_retrait' ? 'var(--red)' : 'var(--green)'};">
            ${tx.type === 'debit_retrait' ? '-' : '+'}${Number(tx.amount_xaf).toLocaleString('fr-FR')} XAF
          </div>
        </div>`
          )
          .join('')
      : `<div class="empty-state">Aucune transaction pour le moment.</div>`;
  } catch (e) {
    // Session de repli invalide/expirée : on l'efface et on propose de se
    // reconnecter plutôt que d'afficher une erreur brute en boucle.
    if (!isInsideTelegram()) {
      clearSessionToken();
      renderLoginWidget(content, () => renderProfile(container));
      return;
    }
    content.innerHTML = `<div class="empty-state">Impossible de charger ton profil.<br><span style="font-size:11px;opacity:0.6;">${e.message}</span></div>`;
  }
}
