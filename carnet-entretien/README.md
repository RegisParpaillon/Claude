# Mon garage : carnet d'entretien

Web app pour iPhone (installable sur l'écran d'accueil) qui suit l'entretien de :
- **Mercedes V220 d** (vidange/Service A et B, boîte auto 7G/9G-Tronic, filtres, liquide de frein, pneus, contrôle technique…)
- **Harley-Davidson FXDRS 114** (vidange moteur, carter primaire, boîte, courroie, pneus avant/arrière, bougies…)
- **VTT électrique Decathlon** (révision, chaîne, plaquettes, purge, fourche, batterie…)

## Fonctions

- **Échéances** : pour chaque point d'entretien, prochaine date et/ou kilométrage, avec un badge
  « Bientôt » ou « En retard ». Avec quelques relevés de compteur, l'appli estime aussi la date.
- **Scanner une facture** (photo, photothèque ou PDF) : véhicule, date, kilométrage, garage, montant et
  travaux réalisés sont reconnus et pré-remplis. Vous vérifiez, puis validez.
  - Sans réglage : lecture sur le téléphone (OCR gratuit). Correcte sur une facture nette, moins fiable sur une photo de travers.
  - Avec une clé API Claude (Réglages ⚙️) : lecture beaucoup plus fiable, quelques centimes par facture.
- **Saisie manuelle** de tout : interventions, kilométrage, pressions des pneus, intervalles du plan, points d'entretien en plus.
- **Contrôles rapides** (pression des pneus, graissage chaîne) : bouton ✓ en un geste.
- **Sauvegarde** : export / import d'un fichier (avec les photos de factures) vers Fichiers, iCloud, mail…

Les données restent sur le téléphone. Les intervalles proposés sont **indicatifs** : vérifiez-les avec
votre carnet constructeur ou votre concession et ajustez-les (✏️ sur chaque point).

## Mise en ligne (une seule fois)

1. Fusionner cette branche dans `main`.
2. Sur GitHub : **Settings → Pages → Build and deployment → Source : GitHub Actions**.
3. L'action « Publier le carnet d'entretien » publie l'app sur https://regisparpaillon.github.io/Claude/

## Installation sur l'iPhone

1. Ouvrir l'adresse ci-dessus dans **Safari**.
2. **Partager** → **Sur l'écran d'accueil** → **Ajouter**.
3. Ouvrir « Garage », renseigner le kilométrage et l'immatriculation de chaque véhicule, puis scanner les
   dernières factures pour que les échéances se calculent.
