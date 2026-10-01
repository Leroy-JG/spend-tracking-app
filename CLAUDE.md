# spend-tracking-app — mémoire du projet

Ce fichier est lu automatiquement par Claude Code à chaque session : le tenir à jour à chaque décision ou étape terminée.

## But
Suivi de dépenses **simple**. Nom affiché : **« Dépenses »** (provisoire : l'utilisateur n'en a pas donné ; les deux autres apps ont un nom propre, Alam et Binkām — à changer dans `app.json`
`name` / `web.name` / `web.shortName`, `src/i18n/fr.ts` `app.name`, `public/manifest.webmanifest`, `public/index.html`). Identifiant `com.depenses.app`, schéma `depenses`, slug `spend-tracking-app`.
Solo, hors ligne, sans compte, Android + iPhone (+ PWA). Application « sœur » d'Alam (`leroy-jg/multi-level-progress-app`) et de Binkām (`leroy-jg/set-timer-app`) : même famille de marque, même pile technique.

## Demande initiale (utilisateur, 2026-10-01)
- Suivre les dépenses en les **rangeant à la main** dans des **étiquettes / tags / projets** (créés par l'utilisateur).
- Ajouter une dépense = **choisir le tag** dans un sélecteur + **montant** + **note facultative**.
- Chaque entrée est enregistrée **dans un calendrier** intégré à l'app (= historique).
- **Suivi** : voir combien on a dépensé sur une **période** par rapport à **un ou plusieurs tags**.
- **Écran principal** : le moyen d'ajouter une dépense en haut, et **en dessous l'historique des dépenses les plus récentes, qui défile** « à l'image des applications d'emploi » (liste de cartes).
- **Charte graphique des deux autres apps**, en changeant un peu la couleur principale et les couleurs « de marque » mais **sans toucher aux couleurs de fonction** (accent or, succès, erreur, etc.).

## Décisions (prises sans que l'utilisateur ait été consulté : à confirmer / corriger)
- Monnaie : **euro**, affichage français (« 1 234,50 € »). Pas de réglage de devise (simple). Montants stockés en **centimes entiers**.
- Les tags ont un **nom** (unique, casse ignorée) et une **couleur** (les 12 pigments de la famille). Supprimer un tag **supprime ses dépenses** (confirmation qui annonce le nombre).
- Dépense = tag + montant (> 0, ≤ 9 999 999,99 €) + note (≤ 500 car.) + **jour** (aujourd'hui par défaut, modifiable via un sélecteur de date, dates futures permises). Modifiable / supprimable en touchant la carte.
- Suivi : périodes **Mois** (‹ ›), **Année** (‹ ›), **Dates** (du … au …), **Tout** ; tags : « Tous » (par défaut) ou une sélection multiple ; résultat = total, nombre de dépenses, détail par tag (montant, part en %, barre).
- Accueil : liste groupée par jour (« Aujourd'hui », « Hier », « lundi 9 mars »…) avec le **total du jour** ; **30 dépenses** puis la suite se charge en approchant du bas (`TabScreen.onNearEnd`, une fois par longueur de contenu) + bouton « Afficher plus » de secours.
- 4 onglets : Accueil, Calendrier, Suivi, Réglages. Réglages : tags (créer / renommer / recolorer / supprimer), confidentialité, export / import JSON, effacement total. **Pas** de réglage de thème (clair / sombre **automatique**, comme Binkām), pas de sauvegardes automatiques (Alam en a ; idée si besoin).
- Données **uniquement locales** (même principe qu'Alam, voir `PRIVACY.md`) : INTERNET retiré, `allowBackup=false`, CSP `connect-src 'none'`, garde-fous dans `src/privacy.test.ts`. L'app **ne demande aucune permission** Android.

## Charte graphique (famille Alam)
- Inchangés : or `#C9A227` / `#E8A317`, succès, erreur, crème `#F4EBD9`, noir chaud `#1C1A17`, pierre. Police **Raleway**. Design à plat, contours 1 px, pilules, cartes à bande de couleur (couleur du tag).
- **Change pour cette app** : fond de marque (`ground`) **`#772247`** (grenat, teinte ≈ 334°), fond sombre **`#3D1426`**, secondaire **rose-damas `#C9708A`** (barres en thème sombre). Surfaces sombres déduites de la teinte (`darkSurfaces`).
  Alam = bleu lapis `#26428B` + turquoise ; Binkām = violet `#5C2E8A` + ciel ; ici grenat + rose-damas : **seuls les fonds vin / grenat (330°–346°) restaient à ≥ 40 de ΔE des deux autres tout en passant `checkPalette`** (balayage fait au départ).
- Règle de la famille : teinte du fond entre 210° et 350° et tous les seuils de `checkPalette` (`src/brand.ts`, copie de celui de Binkām) ; `src/brand.test.ts` vérifie aussi la distance avec Alam et Binkām.
  Changer de couleur ⇒ `PALETTE` dans `src/brand.ts`, `app.json` (splash, icône adaptative), `public/index.html` + `manifest.webmanifest`, `PRIMARY` de `scripts/make-icons.mjs` (et le voile des feuilles `rgba(61,20,38,…)` dans `components.tsx`), puis relancer le script d'icônes.
- Icône : étiquette crème inclinée, deux lignes de note, œillet doré, sur le grenat (`node scripts/make-icons.mjs`, 8 fichiers, nécessite Playwright).

## Architecture
- `src/domain/*` : logique pure, testée avec Vitest (`domain.test.ts`) — `types` (Tag, Entry, limites), `amount` (saisie / lecture / format des montants), `dates` (jours `AAAA-MM-JJ` locaux, périodes), `mutations` (ajout / modif / suppression, renvoient de nouvelles données), `stats` (tri, total par jour, filtre période + tags, résumé par tag), `exchange` (export / import strict, `readData` indulgent pour le stockage).
- `src/storage.ts` : une seule clé `sp:data:v1` (AsyncStorage ; `localStorage` sur le web), écriture renvoyant `false` en cas d'échec ; `src/store/store.tsx` : contexte, **file d'écritures** (la dernière enregistrée est la plus récente), `saveFailed` → bandeau d'alerte dans `Screen.tsx`.
- `src/ui/*` : `theme.tsx` (`themeFor`, `TAG_COLORS`), `components.tsx` (Text Raleway, Button, Chip, TagChip, Segmented, Field, Card, Bar, **Sheet** + ConfirmSheet, BottomBar), `Screen.tsx` (`TabScreen`), `AddForm`, `HomeView`, `EntryRow`, `EntrySheet`, `TagSheet`, `DateSheet`, `MonthGrid`, `CalendarView`, `StatsView`, `SettingsView`, `AmountInput`.
- Feuilles, clavier : **repris d'Alam** (`SheetHost.tsx`, `keyboard.tsx`, `reveal.ts`) — pas de `Modal` natif (voir `CLAUDE.md` d'Alam : Expo 57 edge-to-edge, le clavier n'atteint pas une fenêtre `Modal`) ; `padding-bottom` = hauteur du clavier, `KeyboardScrollView` garde le champ actif visible.
- `src/i18n` : dictionnaire `fr.ts` (+ `t`, `tn` pluriel, `dayLabel`, `formatDate`) prêt pour d'autres langues ; aucun texte en dur dans les écrans (sauf l'`ErrorBoundary` de `app/_layout.tsx`).
- Routes `app/` : `index` (accueil), `calendar`, `stats`, `settings`. `app/_layout.tsx` : polices, thème, store, feuilles, `ErrorBoundary` (« Oups » + Réessayer).
- Web : `public/` (manifest, `sw.js` hors ligne, `register-sw.js`, icônes), CSP `connect-src 'none'` dans `public/index.html`.

## Distribution
- PWA sur GitHub Pages : `.github/workflows/pages.yml` (sur push `main`) — **à activer** : Réglages → Pages → Source : GitHub Actions. `404.html` = `index.html` (repli SPA).
- APK Android : `.github/workflows/android-apk.yml` (à la main ou tag `v*`) → artefact `Depenses-apk` (`Depenses.apk`). Contrôles : manifeste (INTERNET retiré, `allowBackup=false`) puis APK final (`aapt2`,
  **liste blanche** : seule `com.depenses.app.DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION`). Signé avec la clé de debug publique du modèle Expo sauf si les 4 secrets `ANDROID_*` existent (`scripts/sign-release.py`).
  Livrer : incrémenter `version` ET `android.versionCode`.

## Avancement
- [x] Projet créé (Expo 57, TypeScript strict, expo-router, Vitest), palette grenat validée, icône, PWA, workflows, docs
- [x] Domaine + tests (57 tests : montants, dates, tags, dépenses, suivi, import / export, palette, confidentialité, libellés de dates)
- [x] Testé dans Chromium (40 vérifications, viewport téléphone) : création de tags (doublon refusé), saisie du montant (virgule / point / lettres), ajout, date « hier » via le sélecteur, modification, suppression, persistance au rechargement, 120 dépenses (30 puis chargement au scroll jusqu'à 120), calendrier, suivi (mois / année / 2 tags / dates / tout), renommer / supprimer un tag, export, import (invalide refusé / valide), effacement total, thème sombre, **aucune requête externe, aucune erreur console**
- [x] PWA testée sous le sous-chemin GitHub Pages (`EXPO_BASE_URL=/spend-tracking-app`) et **hors ligne** (service worker, données retrouvées)
- [x] Manifeste généré par `expo prebuild` vérifié : aucune permission déclarée (INTERNET, stockage externe, fenêtres flottantes, vibreur retirés), `allowBackup=false`
- [ ] **Jamais exécuté sur téléphone** : AsyncStorage natif, clavier numérique (`decimal-pad`, virgule selon la langue du clavier), feuilles + clavier Android, partage de l'export (`Share`)
- [ ] **Workflows jamais exécutés** (APK : build ≈ 25 min ; la liste blanche de permissions est celle du manifeste généré, à confirmer sur le vrai CI) → lancer « APK Android » sur la branche avant de fusionner
- [ ] Idées (non faites) : ventilation par mois sur la période, moyenne par jour, recherche dans les notes, dépenses récurrentes, devise au choix, thème forcé clair / sombre, sauvegardes automatiques (comme Alam), rappel d'export, stockage persistant web (`navigator.storage.persist()`, comme Alam)

## Notes techniques
- `npx expo install` échoue dans le cloud (proxy) : `npm install pkg@version` avec les versions de `node_modules/expo/bundledNativeModules.json`.
- `expo prebuild` réécrit `scripts.android` / `scripts.ios` de `package.json` (`expo run:*`) : les remettre à `expo start --android` / `--ios`, et supprimer `android/` (ignoré par git).
- Test web : `CI=1 npx expo export --platform web --output-dir dist`, servir `dist/` (`python3 -m http.server`, **sans repli SPA** : naviguer dans l'app, ne pas recharger une sous-page), piloter avec Playwright
  (`/opt/node22/lib/node_modules/playwright`, `executablePath: '/opt/pw-browsers/chromium'`, `--no-sandbox`). Les boutons ont un `accessibilityLabel` = leur titre (sinon le glyphe de l'icône entre dans le nom accessible).
  Une feuille ouverte laisse le formulaire de l'écran dans le DOM : cibler `getByRole('dialog')` pour ses champs, et `.last()` pour « Fermer ».
- Arrêter un serveur de test : `fuser -k PORT/tcp` (pas de `pkill -f`).
- Lancer sur téléphone : `npm install && npm start`, scanner le QR code avec Expo Go.

## Conventions
- Développement sur la branche désignée par la session (`claude/expense-tracking-app-fkpt7z`) ; pas de PR sans demande explicite. Ne jamais commiter `node_modules/`, `dist/` ni `android/`.
- Commandes : `npm start`, `npm test`, `npm run typecheck`.
