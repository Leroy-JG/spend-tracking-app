# Confidentialité — Ṣakk

**Vos données n'existent que sur votre appareil.** L'application n'a ni compte, ni serveur, ni statistiques d'usage :
elle n'envoie rien sur Internet. Vous êtes le seul à détenir vos dépenses.

## Ce qui est stocké, et où

Vos tags (nom, couleur) et vos dépenses (tag, montant, note, date), vos réglages de sauvegarde, et l'historique de vos sauvegardes.

| Version | Emplacement |
|---|---|
| Android (APK) | données et réglages : stockage privé de l'application ; sauvegardes : **fichiers JSON** dans le dossier privé de l'application (`sauvegardes/`), inaccessibles aux autres applications |
| Web / PWA (Android, iPhone) | données et réglages : stockage du navigateur (`localStorage`) ; sauvegardes : stockage du site (IndexedDB), car un navigateur ne permet pas d'écrire dans un dossier |

Les sauvegardes ne sont **pas chiffrées**. Elles ne quittent l'appareil que si vous les exportez vous-même (feuille de partage ou téléchargement) : l'application ne les envoie jamais. « Effacer toutes mes données » supprime aussi les réglages et toutes les sauvegardes de l'historique.

## Ce qui n'arrive jamais

- Aucune donnée envoyée à qui que ce soit : ni au développeur, ni à GitHub, ni à un service tiers.
- Aucun outil de mesure d'audience, de rapport de plantage, de publicité ou de suivi.
- Aucune mise à jour du code à distance (l'APK et la PWA ne changent que quand vous installez / rechargez une nouvelle version).
- Aucun compte, aucune synchronisation.

## Comment c'est garanti (et vérifiable)

| Cible | Verrou technique | Contrôle automatique |
|---|---|---|
| APK Android | La permission `INTERNET` est **retirée** du manifeste (`android.blockedPermissions`) : l'application n'a matériellement pas le droit d'ouvrir une connexion. La sauvegarde automatique Google est désactivée (`android.allowBackup: false`). Les permissions de stockage externe, de fenêtres flottantes et de vibreur, ajoutées par défaut par Expo, sont aussi retirées : **l'application ne demande aucune permission**. | Le workflow « APK Android » contrôle le manifeste généré, puis l'APK final (`aapt2`) : le build échoue si `INTERNET` réapparaît, si une permission inattendue apparaît ou si la sauvegarde Android est réactivée. |
| PWA | Politique de sécurité du navigateur `connect-src 'none'` (`public/index.html`) : la page ne peut ouvrir **aucune** connexion. Aucune ressource externe (police, script, image) : tout vient du site lui-même. | Le workflow « Déployer le site » vérifie la politique dans la page publiée. |
| Code et dépendances | Aucun appel réseau dans `src/` et `app/`, aucun paquet de mesure d'audience / réseau / mise à jour à distance. | `src/privacy.test.ts` (lancé par `npm test`, donc à chaque build). |

Le code est ouvert : vous pouvez tout relire dans ce dépôt.

## Ce que cela ne couvre pas

- **Chargement de la PWA.** Comme pour tout site, quand vous ouvrez la PWA en ligne, GitHub Pages voit votre adresse IP et la demande des fichiers de l'application. Aucune de vos données n'est jointe. L'APK, lui, ne contacte personne une fois installé.
- **Sauvegardes de votre téléphone.** L'application s'exclut de la sauvegarde Android. Les sauvegardes complètes de votre téléphone (iCloud, ordinateur…) dépendent des réglages de votre téléphone.
- **Perte de l'appareil.** Personne d'autre n'a de copie : exportez régulièrement un fichier (Réglages → Exporter dans un fichier). Les sauvegardes automatiques vivent dans l'application : elles sont supprimées avec elle si vous la désinstallez. Sur iPhone, Safari peut vider le stockage d'un site non installé après une longue absence : installez la PWA sur l'écran d'accueil.
