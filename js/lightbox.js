// Petite lightbox plein écran : image agrandie + légende complète, sans
// dépendance externe. Utilisée par les tickets du flux (home.js) quand ils
// contiennent un visuel et/ou un texte potentiellement tronqué visuellement.
let overlay = null;

function ensureOverlay() {
  if (overlay) return overlay;
  overlay = document.createElement('div');
  overlay.className = 'lightbox';
  overlay.innerHTML = `
    <button class="lightbox__close" aria-label="Fermer">✕</button>
    <div class="lightbox__inner">
      <img class="lightbox__image" alt="" />
      <div class="lightbox__caption"></div>
    </div>
  `;
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay || e.target.classList.contains('lightbox__close')) closeLightbox();
  });
  document.body.appendChild(overlay);
  return overlay;
}

// Fonction utilitaire pour parser un markdown basique
function parseMarkdown(text) {
  if (!text) return '';
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/_(.*?)_/g, '<em>$1</em>')
    .replace(/__(.*?)__/g, '<strong>$1</strong>')
    .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>');
  
  // Gérer les titres
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>')
             .replace(/^## (.*$)/gim, '<h2>$1</h2>')
             .replace(/^# (.*$)/gim, '<h1>$1</h1>');
             
  // Gérer les listes à puces
  html = html.replace(/^\- (.*$)/gim, '<ul><li>$1</li></ul>')
             .replace(/<\/ul>\n<ul>/g, '\n');
             
  return html;
}

export function openLightbox({ imageUrl, title, caption, isMarkdown }) {
  const el = ensureOverlay();
  const img = el.querySelector('.lightbox__image');
  const cap = el.querySelector('.lightbox__caption');

  if (imageUrl) {
    img.src = imageUrl;
    img.style.display = 'block';
  } else {
    img.style.display = 'none';
  }
  const parsedCaption = isMarkdown ? parseMarkdown(caption) : (caption || '').replace(/\n/g, '<br>');
  cap.innerHTML = `${title ? `<div class="lightbox__title">${title}</div>` : ''}<div class="lightbox__content" style="margin-top:15px;">${parsedCaption}</div>`;

  el.classList.add('open');
  document.body.style.overflow = 'hidden';
}

export function closeLightbox() {
  if (!overlay) return;
  overlay.classList.remove('open');
  document.body.style.overflow = '';
}
