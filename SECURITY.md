# Sécurité

L'application fonctionne hors ligne, sans compte ni serveur : les données restent sur l'appareil (détails et garanties vérifiables dans [PRIVACY.md](PRIVACY.md)).

- Signaler une vulnérabilité : ouvrir un signalement privé (Security → Report a vulnerability) sur GitHub.
- Sauvegarde : Réglages → Exporter dans un fichier (JSON), ou Réglages → Sauvegardes automatiques (historique gardé dans l'application). Les fichiers ne sont pas chiffrés : les garder en lieu sûr. Personne d'autre n'a de copie des données : sans sauvegarde, elles sont perdues avec l'appareil.
- Installer l'APK uniquement depuis les « Artifacts » / releases de ce dépôt.
- Signature : l'APK est signé avec la clé de debug **publique** du modèle Expo tant que les 4 secrets `ANDROID_*` n'existent pas (voir `CLAUDE.md`).
