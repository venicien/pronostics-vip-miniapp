import { api } from '../api.js';

function formatDate(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
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
    content.innerHTML = `<div class="empty-state">Impossible de charger ton profil.</div>`;
  }
}
