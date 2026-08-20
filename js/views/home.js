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

function renderInteractionsBar(item) {
  const engagement = item.engagement || { likes_count: 0, dislikes_count: 0, favorites_count: 0, shares_count: 0 };
  const userState = item.userState || { reaction: null, is_favorite: false };
  
  const likeClass = userState.reaction === 'like' ? 'active' : '';
  const dislikeClass = userState.reaction === 'dislike' ? 'active' : '';
  const favClass = userState.is_favorite ? 'active' : '';
  
  return `
    <div class="ticket__interactions" data-id="${item.id}">
      <button class="interaction-btn like-btn ${likeClass}" data-action="like">
        <i class="icon">👍</i> <span>${engagement.likes_count || 'J\\'aime'}</span>
      </button>
      <button class="interaction-btn dislike-btn ${dislikeClass}" data-action="dislike">
        <i class="icon">👎</i> <span>${engagement.dislikes_count || ''}</span>
      </button>
      <button class="interaction-btn fav-btn ${favClass}" data-action="favorite">
        <i class="icon">${userState.is_favorite ? '★' : '☆'}</i> <span>${userState.is_favorite ? 'Dans mes favoris' : 'Favoris'}</span>
      </button>
      <button class="interaction-btn comment-btn" data-action="comment">
        <i class="icon">💬</i> <span>Commenter</span>
      </button>
      <button class="interaction-btn share-btn" data-action="share">
        <i class="icon">↗</i> <span>Partager</span>
      </button>
    </div>
    <div class="ticket__comments" id="comments-${item.id}" style="display: none;">
      <div class="comments-list"></div>
      <div class="comment-input-container">
        <input type="text" class="comment-input" placeholder="Ajouter un commentaire..." maxlength="500">
        <button class="comment-submit">Envoyer</button>
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
      ${renderInteractionsBar(item)}
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
      ${renderInteractionsBar(item)}
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

  feed.addEventListener('click', async (e) => {
    const interactionBtn = e.target.closest('.interaction-btn');
    if (interactionBtn) {
      e.stopPropagation();
      const ticketEl = interactionBtn.closest('.ticket');
      const contentId = ticketEl.dataset.id;
      const item = allItems.find((i) => i.id === contentId);
      if (!item) return;
      
      const action = interactionBtn.dataset.action;
      
      try {
        if (action === 'like' || action === 'dislike') {
          const isCurrentlyActive = interactionBtn.classList.contains('active');
          const newReaction = isCurrentlyActive ? null : action;
          
          // Optimistic UI update
          const oldReaction = item.userState.reaction;
          item.userState.reaction = newReaction;
          
          if (oldReaction === 'like') item.engagement.likes_count = Math.max(0, (item.engagement.likes_count || 1) - 1);
          if (oldReaction === 'dislike') item.engagement.dislikes_count = Math.max(0, (item.engagement.dislikes_count || 1) - 1);
          
          if (newReaction === 'like') item.engagement.likes_count = (item.engagement.likes_count || 0) + 1;
          if (newReaction === 'dislike') item.engagement.dislikes_count = (item.engagement.dislikes_count || 0) + 1;
          
          draw();
          
          await api.reactToContent(contentId, newReaction);
        } 
        else if (action === 'favorite') {
          const isFav = !item.userState.is_favorite;
          
          // Optimistic UI update
          item.userState.is_favorite = isFav;
          if (isFav) item.engagement.favorites_count = (item.engagement.favorites_count || 0) + 1;
          else item.engagement.favorites_count = Math.max(0, (item.engagement.favorites_count || 1) - 1);
          
          draw();
          
          await api.toggleFavorite(contentId, isFav);
        }
        else if (action === 'comment') {
          const commentsDiv = ticketEl.querySelector('.ticket__comments');
          const isVisible = commentsDiv.style.display === 'block';
          
          if (!isVisible) {
            commentsDiv.style.display = 'block';
            const listDiv = commentsDiv.querySelector('.comments-list');
            listDiv.innerHTML = '<div class="skeleton" style="height: 40px; margin: 10px;"></div>';
            
            try {
              const { comments } = await api.getComments(contentId);
              if (comments && comments.length > 0) {
                listDiv.innerHTML = comments.map(c => 
                  `<div class="comment-item">
                     <span class="comment-author">${c.author_name}</span>
                     <span class="comment-body">${c.body.replace(/</g, '&lt;')}</span>
                   </div>`
                ).join('');
              } else {
                listDiv.innerHTML = '<div style="font-size: 12px; color: var(--text-muted); text-align: center; padding: 10px;">Aucun commentaire pour le moment. Sois le premier !</div>';
              }
            } catch (e) {
              listDiv.innerHTML = '<div style="font-size: 12px; color: var(--red); text-align: center; padding: 10px;">Erreur de chargement.</div>';
            }
          } else {
            commentsDiv.style.display = 'none';
          }
        }
        else if (action === 'share') {
          const url = `${window.location.origin}/?content=${contentId}`;
          const title = item.title || item.match_label || 'Pronostic VIP';
          
          if (navigator.share) {
            try {
              await navigator.share({ title, url });
              await api.shareContent(contentId, 'native');
              return;
            } catch (err) {
              console.log('Partage annulé ou échoué', err);
            }
          }
          
          // Fallback copier dans le presse-papier
          try {
            await navigator.clipboard.writeText(url);
            alert('Lien copié dans le presse-papier !');
            await api.shareContent(contentId, 'clipboard');
          } catch (err) {
            alert('Impossible de copier le lien.');
          }
        }
      } catch (err) {
        console.error('Erreur interaction:', err);
        // En cas d'erreur (ex: non authentifié), on pourrait rediriger vers le login
      }
      return;
    }
    
    // Gestion de l'envoi de commentaire
    const commentSubmitBtn = e.target.closest('.comment-submit');
    if (commentSubmitBtn) {
      const ticketEl = commentSubmitBtn.closest('.ticket');
      const contentId = ticketEl.dataset.id;
      const inputEl = ticketEl.querySelector('.comment-input');
      const body = inputEl.value.trim();
      
      if (!body) return;
      
      commentSubmitBtn.disabled = true;
      commentSubmitBtn.textContent = '...';
      
      try {
        const { comment } = await api.postComment(contentId, body);
        inputEl.value = '';
        
        const listDiv = ticketEl.querySelector('.comments-list');
        if (listDiv.innerHTML.includes('Aucun commentaire')) {
          listDiv.innerHTML = '';
        }
        
        listDiv.insertAdjacentHTML('beforeend', 
          `<div class="comment-item">
             <span class="comment-author">${comment.author_name}</span>
             <span class="comment-body">${comment.body.replace(/</g, '&lt;')}</span>
           </div>`
        );
      } catch (err) {
        alert(err.message || 'Erreur lors de l\'envoi du commentaire');
      } finally {
        commentSubmitBtn.disabled = false;
        commentSubmitBtn.textContent = 'Envoyer';
      }
      return;
    }
    
    // Comportement normal (lightbox) si on clique ailleurs sur le ticket
    const ticketEl = e.target.closest('.ticket__body--clickable') || e.target.closest('.ticket__image');
    if (!ticketEl) return;
    const parentTicket = ticketEl.closest('.ticket');
    if (!parentTicket) return;
    const item = allItems.find((i) => i.id === parentTicket.dataset.id);
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
    
    // Initialiser les états utilisateur
    allItems.forEach(item => {
      item.userState = { reaction: null, is_favorite: false };
    });
    
    if (!allItems.length) {
      feed.innerHTML = `<div class="empty-state">Aucun pronostic publié pour le moment.<br>Reviens un peu plus tard 👀</div>`;
      return;
    }
    draw();
    
    // Charger les états d'interaction de l'utilisateur (asynchrone)
    try {
      const contentIds = allItems.map(i => i.id);
      const { states } = await api.getInteractionsState(contentIds);
      if (states) {
        allItems.forEach(item => {
          if (states[item.id]) {
            item.userState = states[item.id];
          }
        });
        draw(); // Redessiner avec les boutons actifs
      }
    } catch (err) {
      console.warn('Impossible de charger les interactions (utilisateur non connecté ?)', err);
    }
    
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
