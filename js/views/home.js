import { api } from '../api.js';
import { openLightbox } from '../lightbox.js';

function confidenceDots(level = 0) {
  return Array.from({ length: 5 })
    .map((_, i) => `<span class="confidence__pip ${i < level ? 'filled' : ''}"></span>`)
    .join('');
}

function resultBadge(status) {
  const map = { 
    valide: ['VALIDÉ ✅', 'valide'], 
    gagne: ['GAGNÉ ✅', 'valide'], 
    perdu: ['PERDU ❌', 'perdu'], 
    rembourse: ['REMBOURSÉ 🔄', 'attente'],
    annule: ['ANNULÉ 🚫', 'attente'],
    en_attente: ['EN ATTENTE', 'attente'] 
  };
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

function renderSelection(sel) {
  let dateStr = '';
  if (sel.event_date) {
    const d = new Date(sel.event_date);
    dateStr = d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }) + ' - ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }
  
  const statusMap = {
    gagne: '<span class="ticket__selection-status gagne">GAGNÉ ✅</span>',
    perdu: '<span class="ticket__selection-status perdu">PERDU ❌</span>',
    rembourse: '<span class="ticket__selection-status rembourse">REMBOURSÉ 🔄</span>',
    annule: '<span class="ticket__selection-status rembourse">ANNULÉ 🚫</span>',
    en_attente: ''
  };

  return `
    <div class="ticket__selection">
      <div class="ticket__selection-header">
        <span>${sel.competition || ''}</span>
        <span>${dateStr}</span>
      </div>
      <div class="ticket__selection-teams">
        ${sel.team1_logo_url ? `<img src="${sel.team1_logo_url}" class="ticket__selection-logo" alt="">` : ''}
        <span>${sel.team1_name || ''}</span>
        <span style="color: var(--text-muted); font-size: 11px;">vs</span>
        <span>${sel.team2_name || ''}</span>
        ${sel.team2_logo_url ? `<img src="${sel.team2_logo_url}" class="ticket__selection-logo" alt="">` : ''}
      </div>
      <div class="ticket__selection-footer">
        <div class="ticket__selection-label">${sel.selection_label || ''}</div>
        <div style="display: flex; align-items: center; gap: 8px;">
          ${statusMap[sel.result_status] || ''}
          <div class="ticket__selection-cote">${sel.cote ? sel.cote.toFixed(2) : '-'}</div>
        </div>
      </div>
    </div>
  `;
}

function renderPronosticTicket(item) {
  const isCombine = item.type === 'pronostic_combine';
  
  // Rendu des sélections
  let selectionsHtml = '';
  if (item.selections && item.selections.length > 0) {
    selectionsHtml = `
      <div class="ticket__selections">
        ${item.selections.map(renderSelection).join('')}
      </div>
    `;
  }
  
  return `
    <div class="ticket" data-id="${item.id}">
      ${ticketImage(item)}
      <div class="ticket__body ticket__body--clickable">
        <div class="ticket__label">
          <span>🎟️ Pronostic${isCombine ? ' combiné' : ''}</span>
          <span class="ticket__date">${formatPublishedDate(item.published_at)}</span>
        </div>
        ${!isCombine && item.match_label ? `<div class="ticket__match">${item.match_label}</div>` : ''}
        ${selectionsHtml}
        ${item.analyse ? `<p class="ticket__analyse" style="margin-top: 12px;">${item.analyse}</p>` : ''}
      </div>
      <div class="ticket__tear"></div>
      <div class="ticket__stub">
        <div class="ticket__cote-block">
          <span class="ticket__cote-label">Cote ${isCombine ? 'Totale' : ''}</span>
          <span class="ticket__cote mono">${item.cote ?? '-'}</span>
        </div>
        <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 6px;">
          ${resultBadge(item.result_status)}
          <div class="confidence">${confidenceDots(item.niveau_confiance)}</div>
        </div>
      </div>
    </div>
  `;
}

function renderBilanTicket(item) {
  const linkedHtml = item.linked_pronostic_id 
    ? `<div style="font-size: 11px; color: var(--gold); margin-top: 8px; display: flex; align-items: center; gap: 4px;">
         <i class="icon">🔗</i> Bilan rattaché à un pronostic
       </div>`
    : '';

  return `
    <div class="ticket" data-id="${item.id}">
      ${ticketImage(item)}
      <div class="ticket__body ticket__body--clickable">
        <div class="ticket__label">
          <span>📊 Bilan</span>
          <span class="ticket__date">${formatPublishedDate(item.published_at)}</span>
        </div>
        <div class="ticket__match">${item.title}</div>
        <p class="ticket__analyse">${item.body || ''}</p>
        ${linkedHtml}
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
      
      <div id="stats-container" class="stats-container" style="display: none; margin: 15px 0; background: var(--bg-card); padding: 15px; border-radius: 12px; border: 1px solid rgba(255, 255, 255, 0.05);">
        <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.5px; display: flex; justify-content: space-between; align-items: center;">
          <span>Performances vérifiées</span>
          <span style="color: var(--gold);"><i class="icon">🔒</i> 100% Transparent</span>
        </div>
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; text-align: center;">
          <div>
            <div id="stat-winrate" style="font-size: 24px; font-weight: 700; color: var(--green);">-</div>
            <div style="font-size: 11px; color: var(--text-muted);">Réussite</div>
          </div>
          <div style="border-left: 1px solid rgba(255, 255, 255, 0.1); border-right: 1px solid rgba(255, 255, 255, 0.1);">
            <div id="stat-units" style="font-size: 24px; font-weight: 700; color: var(--text);">-</div>
            <div style="font-size: 11px; color: var(--text-muted);">Bénéfice (U)</div>
          </div>
          <div>
            <div id="stat-cote" style="font-size: 24px; font-weight: 700; color: var(--text);">-</div>
            <div style="font-size: 11px; color: var(--text-muted);">Cote moy.</div>
          </div>
        </div>
      </div>

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

  feed.addEventListener('click', (e) => {
    const ticketEl = e.target.closest('.ticket');
    if (!ticketEl) return;
    const item = allItems.find((i) => i.id === ticketEl.dataset.id);
    if (!item) return;
    openLightbox({
      imageUrl: item.image_url,
      title: item.match_label || item.title,
      caption: item.type === 'bilan' ? item.body : item.analyse,
    });
  });

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
    
    // Charger les stats de manière asynchrone pour ne pas bloquer le feed
    try {
      const { stats } = await api.getStats();
      if (stats && stats.total > 0) {
        container.querySelector('#stats-container').style.display = 'block';
        container.querySelector('#stat-winrate').textContent = \`\${stats.winRate}%\`;
        container.querySelector('#stat-units').textContent = stats.totalUnits > 0 ? \`+\${stats.totalUnits}\` : stats.totalUnits;
        container.querySelector('#stat-units').style.color = stats.totalUnits > 0 ? 'var(--green)' : (stats.totalUnits < 0 ? 'var(--red)' : 'var(--text)');
        container.querySelector('#stat-cote').textContent = stats.averageCote;
      }
    } catch (err) {
      console.warn('Erreur chargement stats:', err);
    }
    
  } catch (e) {
    feed.innerHTML = `<div class="empty-state">Impossible de charger le flux pour le moment.</div>`;
  }
}
