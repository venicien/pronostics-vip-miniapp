import { api } from '../api.js';

function confidenceDots(level = 0) {
  return Array.from({ length: 5 })
    .map((_, i) => `<span class="confidence__pip ${i < level ? 'filled' : ''}"></span>`)
    .join('');
}

function resultBadge(status) {
  const map = { valide: ['VALIDÉ ✅', 'valide'], perdu: ['PERDU ❌', 'perdu'], en_attente: ['EN ATTENTE', 'attente'] };
  const [label, cls] = map[status] || map.en_attente;
  return `<span class="ticket__result-badge ${cls}">${label}</span>`;
}

function renderPronosticTicket(item) {
  return `
    <div class="ticket">
      <div class="ticket__body">
        <div class="ticket__label">🎟️ Pronostic${item.type === 'pronostic_combine' ? ' combiné' : ''}</div>
        <div class="ticket__match">${item.match_label || item.title}</div>
        <p class="ticket__analyse">${item.analyse || ''}</p>
      </div>
      <div class="ticket__tear"></div>
      <div class="ticket__stub">
        <div class="ticket__cote-block">
          <span class="ticket__cote-label">Cote</span>
          <span class="ticket__cote mono">${item.cote ?? '-'}</span>
        </div>
        <div class="confidence">${confidenceDots(item.niveau_confiance)}</div>
      </div>
    </div>
  `;
}

function renderBilanTicket(item) {
  return `
    <div class="ticket">
      <div class="ticket__body">
        <div class="ticket__label">📊 Bilan</div>
        <div class="ticket__match">${item.title}</div>
        <p class="ticket__analyse">${item.body || ''}</p>
      </div>
      <div class="ticket__tear"></div>
      <div class="ticket__stub">
        <div class="ticket__cote-block">
          <span class="ticket__cote-label">ROI</span>
          <span class="ticket__cote mono">${item.roi_percent != null ? item.roi_percent + '%' : '-'}</span>
        </div>
        ${resultBadge(item.result_status)}
      </div>
    </div>
  `;
}

export async function renderHome(container) {
  container.innerHTML = `
    <div class="topbar">
      <div class="eyebrow">Aujourd'hui</div>
      <h1>Pronostics du jour</h1>
    </div>
    <div class="view" id="home-feed">
      <div class="skeleton"></div>
      <div class="skeleton"></div>
    </div>
  `;

  const feed = container.querySelector('#home-feed');

  try {
    const { content } = await api.getContent();
    if (!content || content.length === 0) {
      feed.innerHTML = `<div class="empty-state">Aucun pronostic publié pour le moment.<br>Reviens un peu plus tard 👀</div>`;
      return;
    }
    feed.innerHTML = content
      .map((item) =>
        item.type === 'bilan' ? renderBilanTicket(item) : ['pronostic_unique', 'pronostic_combine'].includes(item.type) ? renderPronosticTicket(item) : ''
      )
      .join('');
  } catch (e) {
    feed.innerHTML = `<div class="empty-state">Impossible de charger le flux pour le moment.</div>`;
  }
}
