import { api } from '../api.js';

function openLink(url) {
  if (!url) return;
  if (window.Telegram?.WebApp?.openLink) window.Telegram.WebApp.openLink(url);
  else window.open(url, '_blank');
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>\"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;', "'": '&#039;'
  }[char]));
}

const OFFER_BADGES = {
  flash: 'Tester sans engagement',
  decouverte: 'Découvrir le VIP',
  mensuel: 'Le plus choisi',
  trimestriel: 'Économie 17%',
  saison: 'Meilleur prix / jour',
  lifetime: 'Accès permanent',
};

function passCardHtml(pass) {
  const duration = pass.duration_days ? `${pass.duration_days} jour${pass.duration_days > 1 ? 's' : ''}` : 'À vie';
  const featured = pass.type === 'mensuel';
  const bestValue = pass.type === 'saison';
  const price = Number(pass.price_xaf || 0);
  const dailyPrice = pass.duration_days ? Math.ceil(price / pass.duration_days).toLocaleString('fr-FR') : null;
  const badge = OFFER_BADGES[pass.type] || 'Accès VIP';
  return `
    <button class="pass-card ${featured ? 'featured' : ''} ${bestValue ? 'best-value' : ''}" data-pass-id="${escapeHtml(pass.id)}" data-pass-name="${escapeHtml(pass.name)}" type="button">
      <span class="pass-card__badge">${badge}</span>
      <span class="pass-card__main">
        <span>
          <span class="pass-card__name">${escapeHtml(pass.name)}</span>
          <span class="pass-card__duration">${duration}${dailyPrice ? ` · environ ${dailyPrice} XAF / jour` : ''}</span>
        </span>
        <span class="pass-card__price mono">${price.toLocaleString('fr-FR')} XAF</span>
      </span>
    </button>
  `;
}

function paymentMethodsHtml() {
  return `
    <div class="payment-method" data-method="mobile_money">
      <div>
        <div class="payment-method__name">📱 Mobile Money</div>
        <div class="payment-method__sub">Orange, MTN, Airtel ou Moov · validation manuelle</div>
      </div>
      <span class="payment-method__tag">Recommandé</span>
    </div>
    <div class="payment-method" data-method="crypto_manual">
      <div>
        <div class="payment-method__name">₿ Crypto · adresse manuelle</div>
        <div class="payment-method__sub">USDT, BTC ou TON · validation manuelle</div>
      </div>
      <span class="payment-method__tag">Manuel</span>
    </div>
    <p class="payment-note">Tu paies directement à l'adresse indiquée, puis tu transmets l'identifiant ou le hash de transaction. Un administrateur vérifie chaque paiement avant l'activation.</p>
  `;
}

function responsibleAcknowledgementHtml() {
  return `
    <label class="responsible-check">
      <input type="checkbox" id="responsible-consent" />
      <span>Je confirme avoir l'âge légal requis dans mon pays et comprendre qu'aucun gain n'est garanti. Je ne mise jamais de l'argent emprunté.</span>
    </label>
  `;
}

export async function renderVip(container) {
  container.innerHTML = `
    <div class="topbar">
      <div class="eyebrow">Accès exclusif</div>
      <h1>Passes VIP</h1>
    </div>
    <div style="background: rgba(255, 60, 60, 0.1); border-left: 3px solid var(--red); padding: 12px 15px; margin: 0 20px 15px 20px; border-radius: 4px; font-size: 12px; color: #ddd;">
      <strong>Rappel :</strong> L'accès VIP vous donne nos analyses et pronostics exclusifs, mais <strong>aucun gain n'est garanti</strong>. Les paris sportifs comportent des risques de perte financière.
    </div>
    <div class="view" id="vip-content">
      <div class="skeleton"></div>
      <div class="skeleton"></div>
    </div>
  `;

  const content = container.querySelector('#vip-content');

  try {
    const { passes } = await api.getVipPasses();
    content.innerHTML = `
      <section class="vip-offer-intro">
        <div class="vip-offer-intro__eyebrow">Ce que comprend chaque Pass</div>
        <h2>Un accès clair, sans promesse irréaliste</h2>
        <div class="vip-benefits">
          <span>✓ Pronostics et analyses exclusifs</span>
          <span>✓ Résultats publiés et vérifiables</span>
          <span>✓ Accès au canal VIP pendant la durée choisie</span>
        </div>
        <p>Choisis la durée qui correspond à ton budget. Le paiement est manuel, sans passerelle automatique : l'accès est activé après vérification humaine.</p>
      </section>
      <div class="pass-list">${passes.map(passCardHtml).join('')}</div>
      <p class="offer-footnote">Les tarifs affichés sont ceux facturés. Un renouvellement avant l'échéance prolonge la durée restante ; il n'y a pas de prélèvement automatique.</p>
    `;

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
    <div class="payment-steps">
      <span class="payment-step active"><b>1</b> Choisir le mode</span>
      <span class="payment-step"><b>2</b> Envoyer la preuve</span>
      <span class="payment-step"><b>3</b> Recevoir l'accès</span>
    </div>
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

    const operators = ['Orange Money', 'MTN Mobile Money', 'Airtel Money', 'Moov Money'];
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
        ${responsibleAcknowledgementHtml()}
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
      if (!detail.querySelector('#responsible-consent')?.checked) {
        detail.querySelector('#responsible-consent')?.focus();
        return;
      }
      const phoneOrTxId = ref ? `${phone} (réf. ${ref})` : phone;
      try {
        await api.submitMobileMoney({ passId, operator, phoneOrTxId, promoCode });
        detail.innerHTML = `
          <div class="empty-state" style="padding: 20px; text-align: center;">
            <div style="font-size: 40px; margin-bottom: 10px;">⏳</div>
            <h3 style="margin-bottom: 10px; color: var(--gold);">Paiement en cours de vérification</h3>
            <p style="color: var(--text); line-height: 1.5; font-size: 14px;">
              Votre demande a bien été envoyée. L'administrateur va valider votre paiement manuellement.<br><br>
              <strong>Cela prend généralement quelques minutes.</strong><br><br>
              Vous recevrez une notification (via le Bot Telegram) dès que votre accès VIP sera activé.
            </p>
          </div>
        `;
      } catch (e) {
        detail.innerHTML = `<div class="empty-state">Erreur : ${e.message}</div>`;
      }
    });
    return;
  }

  if (method === 'crypto_manual') {
    detail.innerHTML = `<div class="empty-state">Chargement…</div>`;

    let cryptoAddresses = {};
    try {
      const { settings } = await api.getSettings();
      cryptoAddresses = JSON.parse(settings.crypto_manual_addresses || '{}');
    } catch (e) {
      cryptoAddresses = {};
    }

    const networks = ['USDT (TRC20)', 'USDT (BEP20)', 'Bitcoin (BTC)', 'TON'];
    const renderAddressBox = (network) => {
      const address = cryptoAddresses[network];
      return address
        ? `<div class="calc-box" style="border-color:var(--gold);"><label>Envoie le montant exact à :</label><div class="mono" style="font-size:14px;color:var(--gold);margin-top:4px;word-break:break-all;">${address}</div></div>`
        : `<div class="empty-state" style="font-size:12px;">Adresse non configurée pour ce réseau, contacte le support.</div>`;
    };

    detail.innerHTML = `
      <div class="calc-box">
        <label>Réseau</label>
        <select id="cm-network" style="width:100%;margin-top:6px;padding:10px;border-radius:8px;background:var(--surface);color:var(--text);border:1px solid var(--border);">
          ${networks.map((n) => `<option value="${n}">${n}</option>`).join('')}
        </select>
      </div>
      <div id="cm-address-box">${renderAddressBox(networks[0])}</div>
      <div class="calc-box">
        <label>Hash de transaction (preuve de paiement)</label>
        <input type="text" id="cm-txhash" placeholder="Ex : 0xabc123... ou l'ID de transaction" />
        ${responsibleAcknowledgementHtml()}
        <button class="btn-primary" id="cm-submit" style="margin-top:14px;">Envoyer pour validation</button>
      </div>
    `;

    detail.querySelector('#cm-network').addEventListener('change', (e) => {
      detail.querySelector('#cm-address-box').innerHTML = renderAddressBox(e.target.value);
    });

    detail.querySelector('#cm-submit').addEventListener('click', async () => {
      const network = detail.querySelector('#cm-network').value;
      const address = cryptoAddresses[network];
      const txHash = detail.querySelector('#cm-txhash').value.trim();
      if (!address) return;
      if (!txHash) return;
      if (!detail.querySelector('#responsible-consent')?.checked) {
        detail.querySelector('#responsible-consent')?.focus();
        return;
      }
      try {
        await api.submitManualCrypto({ passId, network, address, txHash, promoCode });
        detail.innerHTML = `
          <div class="empty-state" style="padding: 20px; text-align: center;">
            <div style="font-size: 40px; margin-bottom: 10px;">⏳</div>
            <h3 style="margin-bottom: 10px; color: var(--gold);">Paiement en cours de vérification</h3>
            <p style="color: var(--text); line-height: 1.5; font-size: 14px;">
              Votre demande a bien été envoyée. L'administrateur va valider votre paiement manuellement.<br><br>
              <strong>Cela prend généralement quelques minutes.</strong><br><br>
              Vous recevrez une notification (via le Bot Telegram) dès que votre accès VIP sera activé.
            </p>
          </div>
        `;
      } catch (e) {
        detail.innerHTML = `<div class="empty-state">Erreur : ${e.message}</div>`;
      }
    });
    return;
  }

  detail.innerHTML = `<div class="empty-state">Mode de paiement indisponible. Choisis Mobile Money ou Crypto manuel.</div>`;
}
