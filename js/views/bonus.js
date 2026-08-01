import { api } from '../api.js';

function bookmakerRowHtml(bm) {
  return `
    <div class="bookmaker-row">
      <div>
        <div class="bookmaker-row__name">${bm.name}</div>
      </div>
      <div style="display:flex;align-items:center;gap:10px;">
        ${bm.promo_code ? `<button class="promo-copy" data-code="${bm.promo_code}">${bm.promo_code} 📋</button>` : ''}
        <a class="btn-secondary" href="${bm.affiliate_link}" target="_blank" rel="noopener">S'inscrire</a>
      </div>
    </div>
  `;
}

function faqItemHtml(item, index) {
  return `
    <div class="ticket" style="margin-bottom:8px;">
      <button class="faq-question" data-index="${index}" style="width:100%;text-align:left;background:transparent;color:var(--text);padding:14px 16px;font-size:14px;display:flex;justify-content:space-between;align-items:center;">
        <span>${item.question}</span>
        <span class="faq-arrow mono">+</span>
      </button>
      <div class="faq-answer" id="faq-answer-${index}" style="display:none;padding:0 16px 14px;color:var(--text-muted);font-size:13px;line-height:1.5;">
        ${item.answer}
      </div>
    </div>
  `;
}

export async function renderBonus(container) {
  container.innerHTML = `
    <div class="topbar">
      <div class="eyebrow">Optimise tes mises</div>
      <h1>Bonus &amp; Bookmakers</h1>
    </div>
    <div class="view">
      <div class="calc-box">
        <label>Ton budget total (XAF)</label>
        <input type="number" id="bankroll-input" placeholder="Ex : 50000" inputmode="numeric" />
        <div class="calc-result" id="calc-result"></div>
      </div>
      <div class="section-title">Partenaires bookmakers</div>
      <div id="bookmakers-list"><div class="skeleton" style="height:60px;"></div></div>

      <div class="section-title">Questions fréquentes</div>
      <div id="faq-list"><div class="skeleton" style="height:60px;"></div></div>
    </div>
  `;

  const input = container.querySelector('#bankroll-input');
  const result = container.querySelector('#calc-result');

  let bankrollPercent = 3; // valeur par défaut si les réglages ne chargent pas
  try {
    const { settings } = await api.getSettings();
    if (settings?.bankroll_percent) bankrollPercent = Number(settings.bankroll_percent);
  } catch (e) {
    // on garde la valeur par défaut
  }

  input.addEventListener('input', () => {
    const budget = Number(input.value);
    if (!budget || budget <= 0) {
      result.textContent = '';
      return;
    }
    const mise = Math.round(budget * (bankrollPercent / 100));
    result.textContent = `Mise recommandée (${bankrollPercent}%) : ${mise.toLocaleString('fr-FR')} XAF`;
  });

  try {
    const { bookmakers } = await api.getBookmakers();
    const list = container.querySelector('#bookmakers-list');
    list.innerHTML = bookmakers.length
      ? bookmakers.map(bookmakerRowHtml).join('')
      : `<div class="empty-state">Aucun partenaire pour le moment.</div>`;

    list.querySelectorAll('.promo-copy').forEach((btn) => {
      btn.addEventListener('click', () => {
        navigator.clipboard?.writeText(btn.dataset.code);
        const original = btn.textContent;
        btn.textContent = 'Copié ✅';
        setTimeout(() => (btn.textContent = original), 1500);
      });
    });
  } catch (e) {
    container.querySelector('#bookmakers-list').innerHTML = `<div class="empty-state">Impossible de charger les partenaires.</div>`;
  }

  try {
    const { faq } = await api.getFaq();
    const faqList = container.querySelector('#faq-list');
    faqList.innerHTML = faq.length ? faq.map(faqItemHtml).join('') : `<div class="empty-state">Aucune question pour le moment.</div>`;

    faqList.querySelectorAll('.faq-question').forEach((btn) => {
      btn.addEventListener('click', () => {
        const answer = faqList.querySelector(`#faq-answer-${btn.dataset.index}`);
        const isOpen = answer.style.display === 'block';
        answer.style.display = isOpen ? 'none' : 'block';
        btn.querySelector('.faq-arrow').textContent = isOpen ? '+' : '−';
      });
    });
  } catch (e) {
    container.querySelector('#faq-list').innerHTML = `<div class="empty-state">Impossible de charger la FAQ.</div>`;
  }
}
