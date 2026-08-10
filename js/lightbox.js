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

export function openLightbox({ imageUrl, title, caption }) {
  const el = ensureOverlay();
  const img = el.querySelector('.lightbox__image');
  const cap = el.querySelector('.lightbox__caption');

  if (imageUrl) {
    img.src = imageUrl;
    img.style.display = 'block';
  } else {
    img.style.display = 'none';
  }
  cap.innerHTML = `${title ? `<div class="lightbox__title">${title}</div>` : ''}<p>${caption || ''}</p>`;

  el.classList.add('open');
  document.body.style.overflow = 'hidden';
}

export function closeLightbox() {
  if (!overlay) return;
  overlay.classList.remove('open');
  document.body.style.overflow = '';
}
