# spend-tracking-app
Application mobile (et web installable) de **suivi de dépenses**, simple et hors ligne. Nom affiché : « Dépenses ».
Troisième application de la famille d'Alam (`multi-level-progress-app`) et de Binkām (`set-timer-app`) : même charte, même pile technique, fond de marque grenat.

- **Ajouter une dépense** : choisir un tag, saisir le montant, une note facultative, la date (aujourd'hui par défaut).
- **Tags faits à la main** (nom + couleur) : Courses, Transport, Loisirs… créés depuis le formulaire ou les Réglages.
- **Accueil** : le formulaire d'ajout en haut, puis les dépenses récentes qui défilent (jour par jour, avec le total du jour), chargées au fil du scroll.
- **Calendrier** : chaque dépense est rangée à sa date ; pastilles de la couleur des tags sur les jours concernés, total du mois, liste du jour.
- **Suivi** : combien dépensé sur une période (mois, année, dates au choix, tout) pour **un ou plusieurs tags**, avec le détail par tag.
- **Vos données n'existent que sur votre appareil** : pas de compte, pas de serveur, aucune connexion sortante (permission Internet retirée de l'APK, politique `connect-src 'none'` pour la PWA). Export / import JSON dans les Réglages. Voir [PRIVACY.md](PRIVACY.md).

## Lancer
```bash
npm install
npm start        # puis scanner le QR code avec Expo Go (Android / iOS), ou appuyer sur "w" pour le web
npm test         # logique métier + garde-fous de confidentialité
npm run typecheck
```

Voir `CLAUDE.md` pour les décisions de conception et l'avancement.
