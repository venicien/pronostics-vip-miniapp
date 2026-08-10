import { api } from '../api.js';

function openLink(url) {
  if (!url) return;
  if (window.Telegram?.WebApp?.openLink) window.Telegram.WebApp.openLink(url);
  else window.open(url, '_blank');
}

function passCardHtml(pass) {
  const duration = pass.duration_days ? `${pass.duration_days} jour${pass.duration_days > 1 ? 's' : ''}` : 'À vie';
  const featured = pass.type === 'mensuel';
  return `
    <div class="pass-card ${featured ? 'featured' : ''}" data-pass-id="${pass.id}" data-pass-name="${pass.name}">
      <div>
        <div class="pass-card__name">${pass.name}</div>
        <div class="pass-card__duration">${duration}</div>
      </div>
      <div class="pass-card__price mono">${pass.price_xaf.toLocaleString('fr-FR')} XAF</div>
    </div>
  `;
}

function paymentMethodsHtml() {
  return `
    <div class="payment-method" data-method="mobile_money">
      <div>
        <div class="payment-method__name">📱 Mobile Money</div>
        <div class="payment-method__sub">Orange, MTN, Wave, Moov — validation admin</div>
      </div>
    </div>
    <div class="payment-method" data-method="nowpayments">
      <div>
        <div class="payment-method__name">₿ Crypto — NOWPayments</div>
        <div class="payment-method__sub">USDT, BTC, TON — validation automatique</div>
      </div>
    </div>
    <div class="payment-method" data-method="cryptomus">
      <div>
        <div class="payment-method__name">₿ Crypto — Cryptomus</div>
        <div class="payment-method__sub">Multi-réseaux — validation automatique</div>
      </div>
    </div>
    <div class="payment-method" data-method="wallet_pay">
      <div>
        <div class="payment-method__name">💎 Telegram Wallet Pay</div>
        <div class="payment-method__sub">Paiement natif dans Telegram</div>
      </div>
    </div>
    <div class="payment-method" data-method="paypal">
      <div>
        <div class="payment-method__name">🅿️ PayPal</div>
        <div class="payment-method__sub">Carte bancaire via PayPal</div>
      </div>
    </div>
  `;
}

export async function renderVip(container) {
  container.innerHTML = `
    <div class="topbar">
      <div class="eyebrow">Accès exclusif</div>
      <h1>Passes VIP</h1>
    </div>
    <div class="view" id="vip-content">
      <div class="skeleton"></div>
      <div class="skeleton"></div>
    </div>
  `;

  const content = container.querySelector('#vip-content');

  try {
    const { passes } = await api.getVipPasses();
    content.innerHTML = passes.map(passCardHtml).join('');

    content.querySelectorAll('.pass-card').forEach((card) => {
      card.addEventListener('click', () => showPaymentStep(container, card.dataset.passId, card.dataset.passName));
    });
  } catch (e) {
    content.innerHTML = `<div class="empty-state">Impossible de charger les offres VIP.</div>`;
  }
}

function showPaymentStep(container, passId, passName) {
  const content = container.querySelector('#vip-content');
  content.innerHTML = `
    <button class="btn-secondary" id="back-btn" style="margin-bottom:16px;">← Retour</button>
    <div class="section-title">Paiement — ${passName}</div>
    <div class="calc-box">
      <label>Code promo (optionnel)</label>
      <input type="text" id="promo-code-input" placeholder="Ex : A1B2C3D4" style="width:100%;margin-top:6px;padding:10px;border-radius:8px;background:var(--surface);color:var(--text);border:1px solid var(--border);text-transform:uppercase;" />
    </div>
    <div id="methods">${paymentMethodsHtml()}</div>
    <div id="method-detail"></div>
  `;

  content.querySelector('#back-btn').addEventListener('click', () => renderVip(container));

  content.querySelectorAll('.payment-method').forEach((el) => {
    el.addEventListener('click', () => {
      const promoCode = content.querySelector('#promo-code-input').value.trim();
      handleMethodClick(content, el.dataset.method, passId, promoCode);
    });
  });
}

async function handleMethodClick(content, method, passId, promoCode) {
  const detail = content.querySelector('#method-detail');

  if (method === 'mobile_money') {
    detail.innerHTML = `<div class="empty-state">Chargement…</div>`;

    let mmAccounts = {};
    try {
      const { settings } = await api.getSettings();
      mmAccounts = JSON.parse(settings.mobile_money_accounts || '{}');
    } catch (e) {
      mmAccounts = {};
    }

    const operators = ['Orange Money', 'MTN Mobile Money', 'Wave', 'Moov Money'];
    const renderAccountBox = (operator) => {
      const account = mmAccounts[operator];
      return account
        ? `<div class="calc-box" style="border-color:var(--gold);"><label>Envoie le montant exact à :</label><div class="mono" style="font-size:16px;color:var(--gold);margin-top:4px;">${account}</div></div>`
        : `<div class="empty-state" style="font-size:12px;">Numéro non configuré pour cet opérateur, contacte le support.</div>`;
    };

    detail.innerHTML = `
      <div class="calc-box">
        <label>Opérateur</label>
        <select id="mm-operator" style="width:100%;margin-top:6px;padding:10px;border-radius:8px;background:var(--surface);color:var(--text);border:1px solid var(--border);">
          ${operators.map((op) => `<option value="${op}">${op}</option>`).join('')}
        </select>
      </div>
      <div id="mm-account-box">${renderAccountBox(operators[0])}</div>
      <div class="calc-box">
        <label>Ton numéro (celui qui a servi à envoyer l'argent)</label>
        <input type="text" id="mm-txid" placeholder="Ex : 07 00 00 00 00" />
        <label style="display:block;margin-top:10px;">ID de transaction (si ton opérateur en fournit un)</label>
        <input type="text" id="mm-ref" placeholder="Optionnel" />
        <button class="btn-primary" id="mm-submit" style="margin-top:14px;">Envoyer pour validation</button>
      </div>
    `;

    detail.querySelector('#mm-operator').addEventListener('change', (e) => {
      detail.querySelector('#mm-account-box').innerHTML = renderAccountBox(e.target.value);
    });

    detail.querySelector('#mm-submit').addEventListener('click', async () => {
      const operator = detail.querySelector('#mm-operator').value;
      const phone = detail.querySelector('#mm-txid').value.trim();
      const ref = detail.querySelector('#mm-ref').value.trim();
      if (!phone) return;
      const phoneOrTxId = ref ? `${phone} (réf. ${ref})` : phone;
      try {
        await api.submitMobileMoney({ passId, operator, phoneOrTxId, promoCode });
        detail.innerHTML = `<div class="empty-state">✅ Demande envoyée ! L'administrateur va valider ton paiement sous peu, tu recevras un message dès l'activation.</div>`;
      } catch (e) {
        detail.innerHTML = `<div class="empty-state">Erreur : ${e.message}</div>`;
      }
    });
    return;
  }

  detail.innerHTML = `<div class="empty-state">Génération du lien de paiement…</div>`;
  try {
    let result;
    if (method === 'nowpayments') result = await api.initiateNowPayments({ passId, promoCode });
    if (method === 'cryptomus') result = await api.initiateCryptomus({ passId, promoCode });
    if (method === 'wallet_pay') result = await api.initiateWalletPay({ passId, promoCode });
    if (method === 'paypal') result = await api.createPaypalOrder({ passId, promoCode });

    const link = result?.invoice?.invoiceUrl || result?.invoice?.payLink || result?.order?.payLink || result?.order?.approveLink;
    if (link) {
      openLink(link);
      detail.innerHTML = `<div class="empty-state">Redirection vers le paiement… si rien ne se passe, <a href="${link}" style="color:var(--gold)">clique ici</a>.</div>`;
    } else {
      detail.innerHTML = `<div class="empty-state">Lien de paiement indisponible pour le moment.</div>`;
    }
  } catch (e) {
    detail.innerHTML = `<div class="empty-state">Erreur : ${e.message}</div>`;
  }
}
