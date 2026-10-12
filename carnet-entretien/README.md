# Carnet d'entretien

Web app simple pour suivre l'entretien de vos véhicules, logement et équipements
(chaudière, appareils…). Elle fonctionne hors ligne et s'installe sur l'iPhone
comme une vraie application.

## Fonctions

- Équipements : voiture, moto, vélo, logement, chaudière, appareil, autre.
- Interventions : date, coût, kilométrage, garage / prestataire, notes.
- Rappels : prochaine échéance par date et/ou kilométrage, avec un badge
  « Bientôt » (30 jours ou 1 000 km avant) ou « En retard ».
- Dépenses de l'année et total par équipement.
- Sauvegarde : export / import d'un fichier JSON (Fichiers, iCloud Drive, mail…).

Les données restent uniquement sur le téléphone. Pensez à exporter une sauvegarde de temps en temps.

## Mise en ligne (une seule fois)

1. Fusionner cette branche dans `main`.
2. Sur GitHub : **Settings → Pages → Build and deployment → Source : GitHub Actions**.
3. L'action « Publier le carnet d'entretien » publie l'app à l'adresse
   `https://<votre-compte>.github.io/<dépôt>/` (par exemple https://regisparpaillon.github.io/Claude/).

## Installation sur l'iPhone

1. Ouvrir l'adresse ci-dessus dans **Safari**.
2. Toucher **Partager** (carré avec une flèche) → **Sur l'écran d'accueil** → **Ajouter**.
3. Lancer « Entretien » depuis l'écran d'accueil.
