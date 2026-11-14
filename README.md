# À deux — Budget

Application budget mobile statique (HTML/CSS/JavaScript classique) avec mode PWA.

## Structure
- `index.html` : interface, markup et chargement ordonné des scripts.
- `css/base.css` et `css/overrides/` : styles extraits par contexte (test, suivi, synthèse, dépenses) et chargés dans l’ordre de cascade d’origine.
- `js/app.js`, `js/ui-compat.js` : script principal et compatibilité UI, chargés comme scripts classiques.
- `assets/icons/` : icônes de l’application.
- `manifest.json`, `sw.js` : installation PWA et cache hors ligne.
- `docs/` : schéma SQL et instructions Supabase.

## Base en ligne
Créer un projet Supabase, exécuter `docs/supabase_schema.sql` dans le SQL Editor, puis saisir l’URL du projet, la clé publique `anon` et le code foyer dans **Réglages**. Ne jamais utiliser la clé `service_role`. Les détails et limites de sécurité sont dans `docs/README_SUPABASE.md`.

## Déploiement
Publier le contenu de ce dossier sur un hébergement statique HTTPS (ou servir `index.html` localement). Le service worker/PWA n’est actif qu’en contexte sécurisé; l’ouverture directe `file://` reste possible pour l’application, sans service worker.
