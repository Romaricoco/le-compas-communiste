# Découpage du scénario pour l'enregistrement des voix

Ce dossier contient le scénario *Félix et la Re-Retirada* et un script qui en
extrait automatiquement les répliques, personnage par personnage et
séquence par séquence, pour préparer l'enregistrement audio.

## Utilisation

```bash
pip install pdfplumber
python3 extraire_repliques.py
```

Par défaut, le script lit `Felix_et_la_Re-Retirada.pdf` dans ce dossier et
écrit les fichiers markdown dans `repliques/`. Vous pouvez aussi préciser un
autre PDF ou dossier de sortie :

```bash
python3 extraire_repliques.py mon_scenario.pdf --out mon_dossier_sortie
```

Relancez simplement le script à chaque fois que le scénario est modifié :
les fichiers de sortie sont régénérés en entier (pas de fusion à faire).

## Fichiers générés

- `repliques_Felix.md`, `repliques_Ana.md`, `repliques_Alain.md`,
  `repliques_Adama.md`, `repliques_Esperanza.md`,
  `repliques_Roberto_Gina.md`, `repliques_Maria.md`, `repliques_Sacha.md` :
  une réplique = numéro/titre de séquence, contexte de scène, didascalie
  éventuelle, et texte exact de la réplique.
- `repliques_Secondaires.md` : tous les rôles secondaires identifiés
  (Miguel, Nahel, voisins, gendarmes, chœur...), avec le nom du
  personnage affiché sur chaque réplique.
- `recap_toutes_sequences.md` : vue d'ensemble séquence par séquence, avec
  le nombre de répliques par personnage, et un total en fin de document.

## Notes sur le découpage

- **Alter-ego "grecs" (séquence 6)** : Felikos/Esperesia/Alanos/Adamos/
  Anastía/Robertios sont automatiquement rattachés à
  Félix/Esperanza/Alain/Adama/Ana/Roberto — l'en-tête d'origine du PDF est
  toujours rappelé entre parenthèses sous chaque réplique concernée.
- **Répliques à en-tête composé** (ex : `ROBERTO/ADAMA`, `NAHEL/ADAMA`) :
  la réplique est dupliquée dans les fichiers de chaque personnage
  concerné, pour qu'aucun comédien ne passe à côté d'une réplique qui le
  concerne.
- **Répliques sans en-tête explicite** (rare, ex. Maria dans le prologue) :
  le personnage est déduit du texte d'action qui précède, et signalé par
  la mention *« personnage déduit du contexte »*.
- Le texte des répliques est repris mot pour mot depuis le PDF, sans
  reformulation.
