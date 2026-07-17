#!/usr/bin/env python3
"""
Découpe un scénario de film (PDF, format Celtx) par personnage et par
séquence, pour préparer l'enregistrement audio des voix.

Usage :
    python3 extraire_repliques.py [chemin_vers_le_pdf] [--out DOSSIER]

Par défaut le script lit "Felix_et_la_Re-Retirada.pdf" dans son propre
dossier et écrit les fichiers markdown dans ./repliques/.

Le script est réutilisable : relancez-le à chaque fois que le PDF du
scénario est mis à jour (nouvelles séquences, répliques modifiées...).

Comment ça marche :
Le PDF (généré par Celtx) encode la mise en forme théâtrale via la
police et la position du texte, pas via des balises explicites :
  - Titre de séquence : gras, aligné à gauche, commence par "Séquence".
  - Nom de personnage  : gras, centré (indice de gauche ~140-340pt).
  - Réplique           : gras, aligné en retrait (~110pt), texte justifié.
  - Traduction/sous-titre : italique, même retrait que la réplique.
  - Didascalie / action : police normale, alignée à gauche (~53pt).
On s'appuie sur ces caractéristiques (police + position) plutôt que sur
une regex texte pour retrouver la structure du script.
"""
from __future__ import annotations

import argparse
import re
import sys
from collections import OrderedDict, defaultdict
from dataclasses import dataclass, field
from pathlib import Path

try:
    import pdfplumber
except ImportError:
    sys.exit(
        "Le module 'pdfplumber' est requis. Installez-le avec :\n"
        "    pip install pdfplumber"
    )

SCRIPT_DIR = Path(__file__).resolve().parent
DEFAULT_PDF = SCRIPT_DIR / "Felix_et_la_Re-Retirada.pdf"
DEFAULT_OUT = SCRIPT_DIR / "repliques"

SEQ_RE = re.compile(r"^S[ée]quence\s+(\d+)\s*:?\s*(.*)$", re.IGNORECASE)

# Bornes empiriques (en points PDF) qui séparent un nom de personnage
# centré d'une réplique alignée en retrait ou d'une didascalie à gauche.
NAME_X0_MIN, NAME_X0_MAX, NAME_WIDTH_MAX = 140, 340, 280
DIALOGUE_X0_MIN, DIALOGUE_X0_MAX = 95, 145

# Personnages principaux et leurs variantes/alter-ego rencontrés dans le
# texte (ex : la séquence 6 est un rêve où chacun porte un nom "grec").
CHARACTERS: "OrderedDict[str, list[str]]" = OrderedDict(
    [
        ("Felix", [r"F[ÉE]LIX", r"F[ÉE]LIKOS"]),
        ("Ana", [r"\bANA\b", r"ANAST[ÍI]A"]),
        ("Alain", [r"\bALAIN\b", r"ALAN[OI]S"]),
        ("Adama", [r"\bADAMA\b", r"ADAMOS"]),
        ("Esperanza", [r"ESPERANZA", r"ESPERESIA"]),
        ("Roberto_Gina", [r"ROBERTO", r"\bGINA\b", r"ROBERTIOS"]),
        ("Maria", [r"MAR[ÍI]A"]),
        ("Sacha", [r"\bSACHA\b"]),
    ]
)
CHARACTER_FILE_LABEL = {
    "Felix": "Félix",
    "Ana": "Ana",
    "Alain": "Alain",
    "Adama": "Adama",
    "Esperanza": "Esperanza",
    "Roberto_Gina": "Roberto / Gina",
    "Maria": "Maria",
    "Sacha": "Sacha",
}

# Rôles secondaires identifiés dans le scénario (regroupés dans un seul
# fichier, mais listés séparément dans le récapitulatif). Toute réplique
# dont l'en-tête ne matche aucun personnage principal ci-dessus tombe
# aussi dans ce fichier, avec le libellé brut nettoyé comme "personnage".
SECONDARY_HINTS = [
    r"MIGUEL",
    r"NAHEL",
    r"PATRON DU RESTAURANT",
    r"VOISIN",
    r"GENDARMETTE",
    r"GENDARME",
    r"CLIENT",
    r"MAMIE ESPAGNOLE",
    r"ASSEMBL[ÉE]E EN CH[ŒO]EUR",
    r"TOUS?,?\s*EN CH[ŒO]EUR",
    r"TOUT LE MONDE",
    r"PROL[ÉE]TAIRE NOMADE",
]

SECONDARY_LABEL_KEY = "Secondaires"


def is_capsish(text: str) -> bool:
    """True si toutes les lettres du texte sont des majuscules (>=2 lettres)."""
    letters = [c for c in text if c.isalpha()]
    return len(letters) >= 2 and all(c.isupper() for c in letters)


def join_wrapped(parts: list[str]) -> str:
    """Joint des lignes segmentées par le retour à la ligne du PDF.

    Si une ligne se termine par un trait d'union collé à une lettre
    (ex: 'Port-La-', 'Cassez-'), on recolle sans espace : il s'agit d'un
    tiret réel du texte coupé par la mise en page, pas d'une césure
    artificielle à retirer.
    """
    out = ""
    for part in parts:
        part = part.strip()
        if not part:
            continue
        if not out:
            out = part
        elif re.search(r"[^\W\d_]-$", out):
            out += part
        else:
            out += " " + part
    return re.sub(r"\s+", " ", out).strip()


@dataclass
class Token:
    kind: str  # "SEQ" | "NAME" | "DIALOGUE" | "TRANSLATION" | "PLAIN"
    text: str
    page: int


@dataclass
class Entry:
    seq_num: int
    seq_title: str
    speaker_raw: str
    page: int
    dialogue: str
    didascalies: list[str] = field(default_factory=list)
    translation: str = ""
    context: str = ""
    inferred: bool = False


def classify_lines(pdf_path: Path) -> list[Token]:
    """Lit le PDF et convertit chaque ligne en Token classé."""
    tokens: list[Token] = []
    with pdfplumber.open(str(pdf_path)) as pdf:
        started = False  # on ignore la page de garde / le préambule
        for page_index, page in enumerate(pdf.pages, start=1):
            for line in page.extract_text_lines():
                text = line["text"].strip()
                if not text:
                    continue
                chars = line["chars"]
                sizes = [c["size"] for c in chars]
                # Ignore les numéros de page (petite police en pied de page)
                if text.isdigit() and max(sizes, default=12) < 10:
                    continue

                x0 = line["x0"]
                x1 = line["x1"]
                fonts = {c["fontname"] for c in chars}
                is_bold = any("Bold" in f for f in fonts)
                is_italic = any("Italic" in f for f in fonts) and not is_bold

                m = SEQ_RE.match(text)
                if is_bold and m and not started:
                    started = True

                if not started:
                    continue

                if is_bold and m:
                    tokens.append(Token("SEQ", text, page_index))
                elif (
                    is_bold
                    and NAME_X0_MIN <= x0 <= NAME_X0_MAX
                    and (x1 - x0) <= NAME_WIDTH_MAX
                    and is_capsish(text)
                ):
                    tokens.append(Token("NAME", text, page_index))
                elif is_bold:
                    tokens.append(Token("DIALOGUE", text, page_index))
                elif is_italic and DIALOGUE_X0_MIN <= x0 <= DIALOGUE_X0_MAX:
                    tokens.append(Token("TRANSLATION", text, page_index))
                else:
                    tokens.append(Token("PLAIN", text, page_index))
    return tokens


def merge_runs(tokens: list[Token]) -> list[Token]:
    """Fusionne les lignes consécutives de même type en un seul token."""
    merged: list[Token] = []
    for tok in tokens:
        if merged and merged[-1].kind == tok.kind:
            prev = merged[-1]
            merged[-1] = Token(
                prev.kind, join_wrapped([prev.text, tok.text]), prev.page
            )
        else:
            merged.append(Token(tok.kind, tok.text.strip(), tok.page))
    return merged


NAME_GUESS_RE = {
    canon: re.compile("|".join(pats), re.IGNORECASE)
    for canon, pats in CHARACTERS.items()
}


def guess_speaker_from_context(context_text: str) -> str | None:
    """Tente de déduire un personnage principal cité dans le texte d'action
    qui précède une réplique en gras non précédée d'un nom de personnage
    (cas rencontré dans le prologue avec Maria)."""
    best_name = None
    best_pos = -1
    for canon, pattern in NAME_GUESS_RE.items():
        for match in pattern.finditer(context_text):
            if match.start() > best_pos:
                best_pos = match.start()
                best_name = canon
    return best_name


def parse_entries(tokens: list[Token]) -> list[Entry]:
    entries: list[Entry] = []
    seq_num, seq_title = 0, ""
    pending_action: list[str] = []  # texte d'action depuis la dernière réplique
    scene_heading = ""

    i = 0
    n = len(tokens)
    while i < n:
        tok = tokens[i]

        if tok.kind == "SEQ":
            m = SEQ_RE.match(tok.text)
            seq_num = int(m.group(1))
            seq_title = fix_title_kerning(m.group(2).strip(" –-"))
            pending_action = []
            scene_heading = ""
            i += 1
            continue

        if tok.kind == "PLAIN":
            if is_capsish(tok.text) and len(tok.text) <= 90:
                scene_heading = tok.text
            else:
                pending_action.append(tok.text)
            i += 1
            continue

        if tok.kind == "TRANSLATION":
            # traduction orpheline (rare) : on l'ignore comme contexte
            i += 1
            continue

        if tok.kind in ("NAME", "DIALOGUE"):
            if tok.kind == "NAME":
                speaker_raw = tok.text
                page = tok.page
                inferred = False
                i += 1
            else:
                # réplique en gras sans en-tête de personnage préalable :
                # on tente de déduire le locuteur depuis le contexte narratif
                context_blob = " ".join(pending_action[-3:])
                guessed = guess_speaker_from_context(context_blob)
                speaker_raw = CHARACTER_FILE_LABEL.get(guessed, "").upper() or "INCONNU"
                page = tok.page
                inferred = True
                # ne pas avancer i : ce token DIALOGUE doit être consommé ci-dessous

            context = " ".join(
                filter(None, [scene_heading, join_wrapped(pending_action)])
            ).strip()
            pending_action = []

            dialogue_parts: list[str] = []
            didascalies: list[str] = []
            translation_parts: list[str] = []

            while i < n:
                nxt = tokens[i]
                if nxt.kind in ("SEQ", "NAME"):
                    break
                if nxt.kind == "DIALOGUE":
                    dialogue_parts.append(nxt.text)
                    i += 1
                elif nxt.kind == "TRANSLATION":
                    translation_parts.append(nxt.text)
                    i += 1
                elif nxt.kind == "PLAIN":
                    # Ligne d'indication (didascalie) seulement si une autre
                    # réplique du même personnage suit ; sinon elle amorce
                    # le contexte du bloc suivant et clôt celui-ci. Pour un
                    # locuteur déduit (pas d'en-tête NAME explicite), on ne
                    # prend jamais ce risque : chaque réplique isolée peut
                    # appartenir à quelqu'un d'autre, donc on clôt toujours.
                    if (
                        not inferred
                        and i + 1 < n
                        and tokens[i + 1].kind == "DIALOGUE"
                    ):
                        didascalies.append(nxt.text)
                        i += 1
                    else:
                        break
                else:
                    break

            if dialogue_parts:
                entries.append(
                    Entry(
                        seq_num=seq_num,
                        seq_title=seq_title,
                        speaker_raw=speaker_raw,
                        page=page,
                        dialogue=join_wrapped(dialogue_parts),
                        didascalies=didascalies,
                        translation=join_wrapped(translation_parts),
                        context=context,
                        inferred=inferred,
                    )
                )
            continue

        i += 1

    return entries


def clean_secondary_label(raw: str) -> str:
    label = re.sub(r"\s+", " ", raw.strip())
    return label.title().replace("’S", "’s")


KERNING_SPLIT_RE = re.compile(r"(\S)\s+([a-zà-öø-ÿ])(?=\s|[!?:;,.]|$)")


def fix_title_kerning(title: str) -> str:
    """Corrige un artefact d'extraction PDF où une police à chasse fixe
    fait apparaître la dernière lettre d'un mot comme un token séparé
    (ex: 'Dépar t' -> 'Départ'). Limité aux titres de séquence (courts),
    car ce correctif serait risqué sur du texte de dialogue (mots d'une
    lettre valides comme 'a', 'y', 'à')."""
    return KERNING_SPLIT_RE.sub(r"\1\2", title)


def resolve_character(header: str) -> list[str]:
    matches = []
    for canon, pattern in NAME_GUESS_RE.items():
        if pattern.search(header):
            matches.append(canon)
    return matches


def is_secondary(header: str) -> str | None:
    for pat in SECONDARY_HINTS:
        if re.search(pat, header, re.IGNORECASE):
            return clean_secondary_label(header)
    return None


def dispatch_entries(entries: list[Entry]) -> "dict[str, list[tuple[Entry, str]]]":
    """Route chaque réplique vers un ou plusieurs fichiers de sortie.

    Retourne un dict clé_fichier -> liste de (Entry, libellé_personnage).
    Une réplique à en-tête composé (ex: 'ROBERTO/ADAMA') est dupliquée
    dans chaque fichier concerné, avec l'en-tête d'origine visible, pour
    qu'aucun comédien ne perde une réplique qui le concerne.
    """
    buckets: "dict[str, list[tuple[Entry, str]]]" = defaultdict(list)

    for e in entries:
        header = e.speaker_raw
        if e.inferred:
            primary = [
                canon
                for canon, label in CHARACTER_FILE_LABEL.items()
                if label.upper() == header
            ]
        else:
            primary = resolve_character(header)

        secondary_label = is_secondary(header) if not e.inferred else None

        if not primary and not secondary_label:
            secondary_label = clean_secondary_label(header) or "Personnage non identifié"

        for canon in primary:
            buckets[canon].append((e, CHARACTER_FILE_LABEL[canon]))
        if secondary_label:
            buckets[SECONDARY_LABEL_KEY].append((e, secondary_label))

    return buckets


def format_entry_md(entry: Entry, label: str, show_label: bool, raw_header: str) -> str:
    lines = []
    title = f"Réplique — p.{entry.page}" if not show_label else f"{label} — p.{entry.page}"
    lines.append(f"#### {title}")
    if raw_header.strip().upper() != label.strip().upper():
        lines.append(f"*(en-tête du scénario : {raw_header.strip()})*")
    if entry.context:
        ctx = entry.context
        if len(ctx) > 260:
            ctx = ctx[:260].rsplit(" ", 1)[0].rstrip() + "..."
        lines.append(f"- **Contexte** : {ctx}")
    if entry.didascalies:
        lines.append(f"- **Didascalie** : {' ; '.join(entry.didascalies)}")
    if entry.inferred:
        lines.append(
            "- **Note** : personnage déduit du contexte (pas d'en-tête explicite dans le PDF)"
        )
    lines.append("")
    lines.append(f"> {entry.dialogue}")
    if entry.translation:
        lines.append("")
        lines.append(f"*{entry.translation}*")
    lines.append("")
    return "\n".join(lines)


def write_character_file(
    out_dir: Path, filename_key: str, display_name: str, items: list[tuple[Entry, str]]
) -> int:
    items = sorted(items, key=lambda pair: (pair[0].seq_num, pair[0].page))
    path = out_dir / f"repliques_{filename_key}.md"
    show_label = filename_key == SECONDARY_LABEL_KEY

    with path.open("w", encoding="utf-8") as f:
        f.write(f"# Répliques — {display_name}\n\n")
        f.write(
            "Généré automatiquement à partir du scénario. "
            "Le texte des répliques est reproduit mot pour mot.\n\n"
        )
        if not items:
            f.write("_Aucune réplique trouvée pour ce personnage dans le scénario._\n")
            return 0

        current_seq = None
        for entry, label in items:
            if entry.seq_num != current_seq:
                current_seq = entry.seq_num
                f.write(f"\n## Séquence {entry.seq_num} : {entry.seq_title}\n\n")
            f.write(format_entry_md(entry, label, show_label, entry.speaker_raw))
            f.write("\n")
    return len(items)


def write_recap(out_dir: Path, entries: list[Entry], buckets: dict) -> None:
    by_seq: "OrderedDict[tuple[int, str], list[str]]" = OrderedDict()
    counts: "dict[tuple[int, str], dict[str, int]]" = defaultdict(lambda: defaultdict(int))

    for key, items in buckets.items():
        display = (
            CHARACTER_FILE_LABEL[key] if key in CHARACTER_FILE_LABEL else None
        )
        for entry, label in items:
            seq_key = (entry.seq_num, entry.seq_title)
            by_seq.setdefault(seq_key, [])
            name = display or label
            counts[seq_key][name] += 1

    total_counts: "dict[str, int]" = defaultdict(int)

    path = out_dir / "recap_toutes_sequences.md"
    with path.open("w", encoding="utf-8") as f:
        f.write("# Récapitulatif — toutes les séquences\n\n")
        f.write(
            "Vue d'ensemble générée automatiquement : personnages présents et "
            "nombre de répliques par séquence.\n\n"
        )
        for seq_key in sorted(by_seq.keys(), key=lambda k: k[0]):
            num, title = seq_key
            f.write(f"## Séquence {num} : {title}\n\n")
            names = counts[seq_key]
            if not names:
                f.write("_Aucune réplique détectée._\n\n")
                continue
            for name, c in sorted(names.items(), key=lambda kv: (-kv[1], kv[0])):
                total_counts[name] += c
                plural = "réplique" if c == 1 else "répliques"
                f.write(f"- **{name}** : {c} {plural}\n")
            f.write("\n")

        f.write("## Total sur l'ensemble du scénario\n\n")
        for name, c in sorted(total_counts.items(), key=lambda kv: (-kv[1], kv[0])):
            plural = "réplique" if c == 1 else "répliques"
            f.write(f"- **{name}** : {c} {plural}\n")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "pdf", nargs="?", default=str(DEFAULT_PDF), help="Chemin vers le PDF du scénario"
    )
    parser.add_argument(
        "--out", default=str(DEFAULT_OUT), help="Dossier de sortie pour les fichiers markdown"
    )
    args = parser.parse_args()

    pdf_path = Path(args.pdf)
    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)

    if not pdf_path.exists():
        sys.exit(f"Fichier introuvable : {pdf_path}")

    print(f"Lecture de {pdf_path} ...")
    tokens = classify_lines(pdf_path)
    tokens = merge_runs(tokens)
    entries = parse_entries(tokens)
    print(f"{len(entries)} répliques détectées.")

    buckets = dispatch_entries(entries)

    for key in list(CHARACTER_FILE_LABEL.keys()) + [SECONDARY_LABEL_KEY]:
        display = CHARACTER_FILE_LABEL.get(key, "Rôles secondaires")
        count = write_character_file(out_dir, key, display, buckets.get(key, []))
        print(f"  repliques_{key}.md : {count} répliques")

    write_recap(out_dir, entries, buckets)
    print(f"recap_toutes_sequences.md écrit dans {out_dir}")


if __name__ == "__main__":
    main()
