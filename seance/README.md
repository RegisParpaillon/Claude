# Ma séance : muscu et running

Web app pour iPhone (installable sur l'écran d'accueil, fonctionne hors ligne) qui génère une séance de
**musculation** ou de **running** adaptée à votre **forme du jour** et à votre **niveau**.

## Ce que fait l'app

**Forme du jour** : avant chaque séance, 4 curseurs (sommeil, énergie, courbatures, stress) et les zones
douloureuses éventuelles. Selon le score, la séance est complète, allégée (charges −8 à −20 %, une série
et des exercices en moins, allures plus douces) ou remplacée par un footing ou du repos.

**Muscu** (programme push / pull / legs en rotation : Push A, Pull, Legs, Push B, Pull, Legs)
- Choix du **matériel disponible** : barre, rack, banc, haltères, kettlebell, poulie, machines, barre de
  traction, dips, élastiques. Sans le matériel, les exercices sont remplacés par des variantes.
- **Échauffement articulaire** puis **mobilité spécifique** au type de séance, avec minuteur pour les
  exercices tenus.
- Mouvements de base : **développé couché** (Push A), **développé militaire** (Push B), **soulevé de terre**
  (Pull), **squat** (Legs), avec séries d'échauffement en montée de charge, puis **accessoires** selon le
  temps disponible (45 à 90 min), remplaçables d'un geste 🔄.
- Pour chaque série : répétitions, charge, temps de récupération. En cochant une série, le **décompte de
  récupération** démarre : −15 s / +15 s, pause, passer, ou toucher le chrono pour choisir un autre temps.
  La récupération par défaut de chaque exercice est aussi modifiable.
- **Progression** : vagues de 3 semaines sur les mouvements de base (ex. intermédiaire 4×8 à 70 %, 4×6 à 75 %,
  4×4+ à 82,5 %), puis +2,5 kg (haut du corps) ou +5 kg (bas du corps). Deux échecs de suite font reculer de 5 %.
  Accessoires en double progression : la charge monte quand toutes les séries atteignent le haut de la fourchette.

**Running**
- Allures calculées à partir d'un chrono de référence (5 km, 10 km, semi, marathon) avec les formules
  de Jack Daniels (VDOT) : endurance fondamentale, seuil, fractionné long, VMA.
- **Fractionné** en rotation : VMA longue (400 m à 1200 m), seuil (5 à 15 min), 30/30. Chaque type
  progresse d'un cran quand la séance est réussie.
- **Sortie longue en EF** : +5 min à chaque sortie réussie, une semaine allégée sur 4.
- **Footing** de récupération.
- Chaque séance affiche la **durée cible** et l'**allure** de chaque bloc, avec un **guidage chronométré**
  (bips à chaque changement d'étape).

**Demande libre ✨** : décrivez la séance voulue en quelques mots (« 40 min haut du corps avec des
haltères, genou fragile », « fractionné court, j'ai 40 minutes »…). Claude compose une séance complète
(échauffement, séries, charges, récupérations ou déroulé chronométré avec allures) d'après votre niveau, vos
charges, vos allures, votre forme du jour et vos dernières séances. Nécessite une clé API Claude, à ajouter
dans le profil (quelques centimes par séance, la clé reste sur le téléphone).

**Progression 🏆 (gamification)**
- XP à chaque séance (séries faites, échauffement complet, minutes courues, séances de qualité).
- Niveaux et rangs E → D → C → B → A → S → SS.
- **Avatar manga à partir d'une photo ou d'un selfie** : la photo est transformée en case de manga sur le
  téléphone (traits à l'encre, trames de points, aplats noirs, lignes de vitesse et cadre aux couleurs du rang),
  avec recadrage au doigt et réglage des traits et des ombres. Rien n'est envoyé sur internet. Les effets
  s'intensifient avec le rang. Sans photo, un avatar dessiné est affiché.
- Quêtes hebdomadaires adaptées au niveau (séances muscu, sorties running, fractionné, sortie longue,
  échauffement complet) et bonus « semaine parfaite ».
- 14 badges (premier pas, vague domptée, record, 10 000 kg en une séance, 200 km courus, série de semaines…).
- Écran « LEVEL UP ! » à la fin de la séance.

Les données restent sur le téléphone (export / import d'une sauvegarde dans le profil).
Les charges proposées pour les accessoires au premier usage sont des estimations : corrigez-les en
touchant la série, l'app retient la charge utilisée.

## Adresse

Publiée avec le carnet d'entretien : https://regisparpaillon.github.io/Claude/seance/
(Safari → Partager → Sur l'écran d'accueil).
