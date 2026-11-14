# Migration Supabase — À deux

## Installation
1. Créez un projet Supabase.
2. Dans **SQL Editor**, exécutez `supabase_schema.sql`. Le script est réexécutable. Il conserve la structure historique `budget_months(home_code, month, data)` pour compatibilité avec `supabase_setup.sql` déjà fourni.
3. Dans Supabase **Project Settings → API**, copiez l’URL du projet et la clé **anon/public** (jamais `service_role`).
4. Ouvrez l’application, allez dans **Réglages**, saisissez URL, clé publique et un identifiant de foyer commun, puis **Connecter et charger**.
5. Sur l’appareil contenant l’ancien `localStorage.budgetApp`, ouvrez **Réglages → Importer une fois le stockage local**, confirmez le foyer. L’import est idempotent et conserve la source locale. Il peut être relancé après import interrompu; les données du même foyer/mois sont fusionnées par identifiants.

## Modèle relationnel et mapping
- `foyers`, `personnes`, `comptes`: foyer et personnes Julien/Carla/Commun, comptes bancaires de référence.
- `revenus`: propriétaire, montant en euros, période, jour de versement; JSONB `attributes` conserve les propriétés métier complémentaires.
- `depenses`: catégorie, montant, propriétaire, payeur, répartition/prorata, type, mode de prélèvement, dates actives, jour récurrent et mode avance/parts; `attributes` conserve les champs UI supplémentaires (curseur %, règles, etc.).
- `depense_etats_mensuels`: case payé, date réelle, jour ajusté et paiement par personne par mois.
- `depense_paiements`: versements multiples individualisés par mois, payeur, montant et date réelle. `depense_prelevements` accueille des échéances programmées distinctes.
- `soldes_reels`: historique daté de soldes par personne.
- `remboursements`: transferts/remboursements datés par mois.
- `reglages_foyer`, `ajustements`: paramètres logement et états des ajustements automatiques. `budget_months.data` garde les métadonnées d’état de l’interface par mois; ce n’est pas le stockage unique des revenus/dépenses.

Les montants sont `numeric(14,2)`, dates en `date`, et identifiants historiques en `text` pour préserver les IDs existants. La configuration URL/clé/code est seulement locale au navigateur.

## Garantie du mode test et sauvegarde
Toutes les écritures métier passent par `save()` → repository Supabase. Quand Mode test est actif, `save()` retourne avant le repository; aucun import n’est autorisé. Les modifications sont donc uniquement en mémoire et une bannière persistante affiche **« Mode test - non sauvegardé »**. Quitter ce mode relance le chargement distant, écartant les changements de test. Une recharge ferme également la session volatile.

En mode normal, chaque action métier appelle `save()` et déclenche une écriture relationnelle; une file sérialise les sauvegardes automatiques. Les erreurs réseau/policy sont affichées dans une bannière et les changements restent temporairement en mémoire, sans prétendre qu’ils sont sauvegardés.

## Limites de sécurité
Le schéma active RLS mais utilise une policy `anon_all` permissive, sans authentification, pour permettre l’usage couple avec la clé publique. L’identifiant/code de foyer n’est pas une protection d’accès : toute personne ayant URL + clé publique peut lire ou modifier les données. N’y mettez pas de données sensibles. Pour une vraie confidentialité, il faut ajouter Auth Supabase, rattacher le foyer aux utilisateurs et remplacer les policies ouvertes par des policies limitées. La clé `service_role` ne doit jamais figurer dans l’application.
