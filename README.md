# spend-tracking-app
Application mobile (et web installable) de **suivi de dépenses**, simple et hors ligne. Nom affiché : **« Ṣakk »**.
Troisième application de la famille d'Alam (`multi-level-progress-app`) et de Binkām (`set-timer-app`) : même charte, même pile technique, fond de marque grenat.

- **Ajouter une dépense** : choisir un tag, saisir le montant, une note facultative, la date (aujourd'hui par défaut).
- **Tags faits à la main** (nom + couleur) : Courses, Transport, Loisirs… créés depuis le formulaire ou les Réglages.
- **Accueil** : le formulaire d'ajout en haut, puis les dépenses récentes qui défilent (jour par jour, avec le total du jour), chargées au fil du scroll.
- **Calendrier** : chaque dépense est rangée à sa date ; pastilles de la couleur des tags sur les jours concernés, total du mois, liste du jour.
- **Suivi** : combien dépensé sur une période (mois, année, dates au choix, tout) pour **un ou plusieurs tags**, avec le détail par tag.
- **Vos données n'existent que sur votre appareil** : pas de compte, pas de serveur, aucune connexion sortante (permission Internet retirée de l'APK, politique `connect-src 'none'` pour la PWA). Voir [PRIVACY.md](PRIVACY.md).
- **Sauvegardes** : tout passe par des fichiers JSON. Sauvegardes automatiques facultatives (tous les N jours ou semaines, 5 à 50 conservées), chacune gardée dans le dossier de l'application avec un **historique** (restaurer, exporter, supprimer) ; export vers un endroit de votre choix et import depuis un fichier dans les Réglages.

## Télécharger
- **Android** : dernier `Sakk.apk` sur la page [Releases](../../releases/latest) du dépôt (ouvrir le fichier sur le téléphone, autoriser l'installation depuis cette source).
- **Web / iPhone** : https://leroy-jg.github.io/spend-tracking-app/ (ouvrir dans Chrome ou Safari, « Ajouter à l'écran d'accueil »).

## Lancer
```bash
npm install
npm start        # puis scanner le QR code avec Expo Go (Android / iOS), ou appuyer sur "w" pour le web
npm test         # logique métier + garde-fous de confidentialité
npm run typecheck
```

Voir `CLAUDE.md` pour les décisions de conception et l'avancement.
