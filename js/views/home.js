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

// Affiche une date relative et lisible (Aujourd'hui, Hier, ou JJ/MM à HH:mm)
// pour que le flux ne paraisse pas figé et que le tri chronologique soit visible.
function formatPublishedDate(iso) {
  if (!iso) return '';
  const date = new Date(iso);
  const now = new Date();
  const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((startOfDay(now) - startOfDay(date)) / 86400000);
  const time = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  if (diffDays === 0) return `Aujourd'hui · ${time}`;
  if (diffDays === 1) return `Hier · ${time}`;
  return `${date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })} · ${time}`;
}

function ticketImage(item) {
  if (!item.image_url) return '';
  return `<img class="ticket__image" src="${item.image_url}" alt="" loading="lazy" onerror="this.remove()">`;
}

function renderPronosticTicket(item) {
  return `
    <div class="ticket">
      ${ticketImage(item)}
      <div class="ticket__body">
        <div class="ticket__label">
          <span>🎟️ Pronostic${item.type === 'pronostic_combine' ? ' combiné' : ''}</span>
          <span class="ticket__date">${formatPublishedDate(item.published_at)}</span>
        </div>
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
      ${ticketImage(item)}
      <div class="ticket__body">
        <div class="ticket__label">
          <span>📊 Bilan</span>
          <span class="ticket__date">${formatPublishedDate(item.published_at)}</span>
        </div>
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

const FILTERS = [
  { key: 'all', label: 'Tous' },
  { key: 'pronostic', label: 'Pronostics' },
  { key: 'bilan', label: 'Bilans' },
];

function matchesFilter(item, filterKey) {
  if (filterKey === 'all') return true;
  if (filterKey === 'pronostic') return item.type === 'pronostic_unique' || item.type === 'pronostic_combine';
  if (filterKey === 'bilan') return item.type === 'bilan';
  return true;
}

function renderList(items) {
  if (!items.length) {
    return `<div class="empty-state">Rien à afficher pour ce filtre.<br>Reviens un peu plus tard 👀</div>`;
  }
  return items
    .map((item) =>
      item.type === 'bilan' ? renderBilanTicket(item) : ['pronostic_unique', 'pronostic_combine'].includes(item.type) ? renderPronosticTicket(item) : ''
    )
    .join('');
}

export async function renderHome(container) {
  container.innerHTML = `
    <div class="topbar">
      <div class="eyebrow">Fil d'actualité</div>
      <h1>Pronostics &amp; bilans</h1>
      <div class="filter-tabs" id="home-filters">
        ${FILTERS.map((f, i) => `<button class="filter-tab${i === 0 ? ' active' : ''}" data-filter="${f.key}">${f.label}</button>`).join('')}
      </div>
    </div>
    <div class="view" id="home-feed">
      <div class="skeleton"></div>
      <div class="skeleton"></div>
    </div>
  `;

  const feed = container.querySelector('#home-feed');
  const filterBar = container.querySelector('#home-filters');
  let allItems = [];
  let activeFilter = 'all';

  function draw() {
    // Le tri chronologique (plus récent en premier) est déjà garanti côté
    // serveur (ORDER BY published_at DESC), on retrie quand même ici par
    // sécurité pour ne jamais dépendre implicitement de l'ordre de l'API.
    const sorted = [...allItems].sort((a, b) => new Date(b.published_at) - new Date(a.published_at));
    feed.innerHTML = renderList(sorted.filter((item) => matchesFilter(item, activeFilter)));
  }

  filterBar.addEventListener('click', (e) => {
    const btn = e.target.closest('.filter-tab');
    if (!btn) return;
    activeFilter = btn.dataset.filter;
    filterBar.querySelectorAll('.filter-tab').forEach((b) => b.classList.toggle('active', b === btn));
    draw();
  });

  try {
    const { content } = await api.getContent();
    allItems = (content || []).filter((item) => ['pronostic_unique', 'pronostic_combine', 'bilan'].includes(item.type));
    if (!allItems.length) {
      feed.innerHTML = `<div class="empty-state">Aucun pronostic publié pour le moment.<br>Reviens un peu plus tard 👀</div>`;
      return;
    }
    draw();
  } catch (e) {
    feed.innerHTML = `<div class="empty-state">Impossible de charger le flux pour le moment.</div>`;
  }
}
