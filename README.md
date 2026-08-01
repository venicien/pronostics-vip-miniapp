# Mini App — Déploiement Vercel

## 1. Déployer
1. Pousse ce dossier `miniapp/` dans un repo Git
2. Sur https://vercel.com : New Project → importe le repo
3. Aucune configuration de build nécessaire (site statique, zéro dépendance) :
   - Framework Preset : **Other**
   - Build Command : *(vide)*
   - Output Directory : `.`
4. Une fois déployé, tu obtiens une URL du type `https://ton-projet.vercel.app`

## 2. Relier au backend Render
Ouvre `index.html` et remplace :
```html
<script>
  window.__API_BASE_URL__ = 'https://ton-backend.onrender.com';
</script>
```
par l'URL réelle de ton service Render (Phase 2).

## 3. Déclarer la Mini App sur BotFather
1. `/mybots` → sélectionne ton bot → **Bot Settings** → **Menu Button** (ou **Configure Mini App**)
2. Renseigne l'URL Vercel comme URL de la Mini App
3. Le bouton "📲 Ouvrir la Mini App" envoyé par `/start` (Phase 2) pointe déjà vers
   `MINI_APP_URL` défini dans les variables d'environnement Render — assure-toi
   qu'il correspond bien à l'URL Vercel finale.

## 4. Sécurité — rappel important
Chaque appel de la Mini App vers le backend transporte `window.Telegram.WebApp.initData`
dans le header `X-Telegram-Init-Data`. Le backend vérifie sa signature HMAC avant de
faire confiance au `telegram_id` (voir `verifyTelegramWebAppData.js` en Phase 2).
**Cela ne fonctionne que si la page est ouverte depuis Telegram** (WebApp officielle) —
un simple navigateur classique n'aura pas de `initData` valide, ce qui est le comportement attendu.

## 5. Structure du projet
```
miniapp/
├── index.html          # shell + config API_BASE_URL
├── vercel.json          # headers de sécurité
├── css/styles.css       # design tokens + composant "ticket à souche"
└── js/
    ├── api.js            # client API (initData Telegram signé)
    ├── app.js             # routeur + navigation basse + bannière flash
    └── views/
        ├── home.js         # flux pronostics/bilans
        ├── vip.js           # catalogue pass + choix paiement
        ├── bonus.js         # calculateur bankroll + bookmakers
        └── profile.js       # statut VIP + wallet + parrainage
```

## Prochaine étape
Phase 4 : le Dashboard Admin (Vercel également), qui appelle les routes
`/api/admin/*` déjà prêtes côté backend (contenu, bannières, bookmakers).
