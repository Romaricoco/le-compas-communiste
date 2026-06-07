/* Illustrations politiques — style affiche constructiviste
   Fond sombre, figures claires (#eadfc6) + rouge (#b8121b)
   Chaque image doit convaincre en une seconde */

/* I — Propriété
   Un gros bourgeois possède tout.
   Les ouvriers n'ont rien et tendent la main. */
export const IconPropriete = () => (
  <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    {/* Chapeau haut-de-forme */}
    <rect x="36" y="0" width="28" height="13" fill="#eadfc6"/>
    <rect x="28" y="13" width="44" height="5" fill="#eadfc6"/>
    {/* Tête grosse */}
    <ellipse cx="50" cy="29" rx="18" ry="14" fill="#eadfc6"/>
    {/* Yeux satisfaits */}
    <ellipse cx="43" cy="26" rx="3" ry="2.5" fill="#150506"/>
    <ellipse cx="57" cy="26" rx="3" ry="2.5" fill="#150506"/>
    {/* Sourire suffisant */}
    <path d="M42 33 Q50 40 58 33" stroke="#150506" strokeWidth="2" strokeLinecap="round" fill="none"/>
    {/* Corps large — costume */}
    <path d="M12 44 Q50 36 88 44 L92 78 L8 78 Z" fill="#eadfc6"/>
    {/* Revers sombre */}
    <path d="M50 37 L40 51 L50 59 L60 51 Z" fill="#150506"/>
    {/* Bras gauche → usine */}
    <line x1="14" y1="52" x2="4" y2="62" stroke="#eadfc6" strokeWidth="5" strokeLinecap="round"/>
    {/* Usine qu'il "possède" */}
    <rect x="-4" y="50" width="16" height="14" fill="#b8121b"/>
    <rect x="-2" y="42" width="5" height="9" fill="#b8121b"/>
    <rect x="5" y="45" width="4" height="6" fill="#b8121b"/>
    {/* Bras droit → sac d'argent */}
    <line x1="86" y1="52" x2="96" y2="62" stroke="#eadfc6" strokeWidth="5" strokeLinecap="round"/>
    <circle cx="94" cy="72" r="11" fill="#b8121b"/>
    <path d="M91 69 Q94 64 97 69" stroke="#eadfc6" strokeWidth="1.5" strokeLinecap="round"/>
    <text x="94" y="77" textAnchor="middle" fill="#eadfc6" fontSize="11" fontFamily="serif" fontWeight="bold">$</text>
    {/* Ligne de sol */}
    <line x1="0" y1="82" x2="100" y2="82" stroke="#b8121b" strokeWidth="2"/>
    {/* Petits ouvriers rouges qui tendent les bras */}
    {[12, 28, 50, 72, 88].map((x, i) => (
      <g key={i}>
        <circle cx={x} cy="88" r="4" fill="#b8121b"/>
        <rect x={x - 3} y="92" width="6" height="7" fill="#b8121b"/>
        <line x1={x} y1="85" x2={x + (50 - x) * 0.15} y2="78" stroke="#b8121b" strokeWidth="2" strokeLinecap="round"/>
      </g>
    ))}
  </svg>
);

/* II — Hiérarchie
   Un directeur en costume monte sur le dos courbé d'un ouvrier.
   L'exploitation rendue visible. */
export const IconHierarchie = () => (
  <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    {/* OUVRIER — courbé, rouge, porte tout */}
    {/* Tête à gauche bas */}
    <circle cx="16" cy="72" r="7" fill="#b8121b"/>
    {/* Corps en diagonale (courbé) */}
    <path d="M16 65 L72 36 L76 46 L20 75 Z" fill="#b8121b"/>
    {/* Bras qui portent */}
    <line x1="16" y1="70" x2="4" y2="84" stroke="#b8121b" strokeWidth="5" strokeLinecap="round"/>
    <line x1="20" y1="68" x2="12" y2="82" stroke="#b8121b" strokeWidth="4" strokeLinecap="round"/>
    {/* Jambes */}
    <line x1="8" y1="84" x2="6" y2="98" stroke="#b8121b" strokeWidth="5" strokeLinecap="round"/>
    <line x1="14" y1="86" x2="18" y2="98" stroke="#b8121b" strokeWidth="5" strokeLinecap="round"/>
    {/* Gouttes de sueur */}
    <circle cx="28" cy="80" r="2" fill="#b8121b" opacity="0.6"/>
    <circle cx="34" cy="85" r="1.5" fill="#b8121b" opacity="0.5"/>
    <circle cx="24" cy="86" r="1.5" fill="#b8121b" opacity="0.4"/>

    {/* DIRECTEUR — droit, clair, assis sur le dos de l'ouvrier */}
    {/* Chapeau */}
    <rect x="55" y="4" width="22" height="9" fill="#eadfc6"/>
    <rect x="50" y="13" width="32" height="4" fill="#eadfc6"/>
    {/* Tête */}
    <circle cx="66" cy="26" r="11" fill="#eadfc6"/>
    {/* Yeux contents */}
    <ellipse cx="61" cy="24" rx="2.5" ry="2" fill="#150506"/>
    <ellipse cx="71" cy="24" rx="2.5" ry="2" fill="#150506"/>
    <path d="M60 30 Q66 35 72 30" stroke="#150506" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
    {/* Corps costume */}
    <path d="M50 37 Q66 32 82 37 L84 60 L48 60 Z" fill="#eadfc6"/>
    <path d="M66 33 L58 43 L66 50 L74 43 Z" fill="#150506"/>
    {/* Mallette d'argent */}
    <rect x="83" y="46" width="16" height="12" rx="2" fill="#b8121b"/>
    <line x1="83" y1="52" x2="99" y2="52" stroke="#eadfc6" strokeWidth="1"/>
    <line x1="89" y1="46" x2="89" y2="58" stroke="#eadfc6" strokeWidth="1"/>
    {/* Ligne de sol */}
    <line x1="0" y1="99" x2="100" y2="99" stroke="#b8121b" strokeWidth="2"/>
  </svg>
);

/* III — État
   Une pyramide écrase les petites gens.
   L'État centralisé comme structure de domination. */
export const IconEtat = () => (
  <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    {/* Pyramide (État/Parti) */}
    <polygon points="50,5 2,88 98,88" fill="#eadfc6"/>
    {/* Ombre / relief */}
    <polygon points="50,5 50,88 98,88" fill="#d8c9a6" opacity="0.6"/>
    {/* Étoile du parti au sommet */}
    <polygon
      points="50,10 52,17 59,17 53.5,21 55.5,28 50,24 44.5,28 46.5,21 41,17 48,17"
      fill="#b8121b"
    />
    {/* Petites silhouettes rouges écrasées à la base */}
    {[10, 22, 34, 50, 66, 78, 90].map((x, i) => (
      <g key={i}>
        {/* Corps aplati sous la pyramide */}
        <ellipse cx={x} cy="93" rx="5" ry="3.5" fill="#b8121b"/>
        {/* Petite tête visible */}
        <circle cx={x} cy="89" r="3" fill="#b8121b"/>
        {/* Bras tendus (oppression) */}
        <line x1={x - 5} y1="92" x2={x - 9} y2="88" stroke="#b8121b" strokeWidth="1.5" strokeLinecap="round"/>
        <line x1={x + 5} y1="92" x2={x + 9} y2="88" stroke="#b8121b" strokeWidth="1.5" strokeLinecap="round"/>
      </g>
    ))}
    {/* Flèches d'oppression vers le bas */}
    <line x1="50" y1="40" x2="50" y2="80" stroke="#b8121b" strokeWidth="1.5" strokeDasharray="3 3"/>
    <line x1="30" y1="55" x2="25" y2="78" stroke="#b8121b" strokeWidth="1" strokeDasharray="2 3" opacity="0.7"/>
    <line x1="70" y1="55" x2="75" y2="78" stroke="#b8121b" strokeWidth="1" strokeDasharray="2 3" opacity="0.7"/>
  </svg>
);

/* IV — Monde / Guerre capitaliste (Jaurès)
   Deux soldats-ouvriers se font face avec des fusils.
   Au-dessus : le bourgeois tire les ficelles et compte l'argent.
   "Le capitalisme porte en lui la guerre comme la nuée porte l'orage." */
export const IconMonde = () => (
  <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    {/* BOURGEOIS — marionnettiste, en haut au centre */}
    <rect x="38" y="1" width="24" height="10" fill="#eadfc6"/>
    <rect x="32" y="11" width="36" height="4" fill="#eadfc6"/>
    <ellipse cx="50" cy="25" rx="13" ry="11" fill="#eadfc6"/>
    <ellipse cx="44" cy="23" rx="2.5" ry="2" fill="#150506"/>
    <ellipse cx="56" cy="23" rx="2.5" ry="2" fill="#150506"/>
    <path d="M43 29 Q50 35 57 29" stroke="#150506" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
    <path d="M28 36 Q50 30 72 36 L74 54 L26 54 Z" fill="#eadfc6"/>
    <path d="M50 31 L43 40 L50 47 L57 40 Z" fill="#150506"/>
    {/* Piles d'argent */}
    <rect x="38" y="44" width="24" height="8" rx="1" fill="#b8121b"/>
    <text x="50" y="51" textAnchor="middle" fill="#eadfc6" fontSize="8" fontFamily="serif" fontWeight="bold">$$$</text>
    {/* Ficelles de marionnettiste */}
    <line x1="34" y1="54" x2="20" y2="70" stroke="#eadfc6" strokeWidth="1" strokeDasharray="2 2" opacity="0.8"/>
    <line x1="66" y1="54" x2="80" y2="70" stroke="#eadfc6" strokeWidth="1" strokeDasharray="2 2" opacity="0.8"/>

    {/* SOLDAT GAUCHE — ouvrier, rouge */}
    <circle cx="18" cy="73" r="6" fill="#b8121b"/>
    <path d="M12 71 Q18 67 24 71" fill="#b8121b"/>
    <rect x="14" y="79" width="9" height="14" fill="#b8121b"/>
    {/* Fusil pointant à droite */}
    <line x1="22" y1="81" x2="50" y2="68" stroke="#b8121b" strokeWidth="2.5" strokeLinecap="round"/>
    <line x1="50" y1="68" x2="56" y2="65" stroke="#b8121b" strokeWidth="1.5"/>

    {/* SOLDAT DROIT — ouvrier, rouge */}
    <circle cx="82" cy="73" r="6" fill="#b8121b"/>
    <path d="M76 71 Q82 67 88 71" fill="#b8121b"/>
    <rect x="77" y="79" width="9" height="14" fill="#b8121b"/>
    {/* Fusil pointant à gauche */}
    <line x1="78" y1="81" x2="50" y2="68" stroke="#b8121b" strokeWidth="2.5" strokeLinecap="round"/>
    <line x1="50" y1="68" x2="44" y2="65" stroke="#b8121b" strokeWidth="1.5"/>

    {/* Barbelés entre eux */}
    <line x1="5" y1="96" x2="95" y2="96" stroke="#eadfc6" strokeWidth="1.5"/>
    {[15, 25, 35, 50, 65, 75, 85].map((x, i) => (
      <g key={i}>
        <line x1={x} y1="96" x2={x - 3} y2="92" stroke="#eadfc6" strokeWidth="1"/>
        <line x1={x} y1="96" x2={x + 3} y2="92" stroke="#eadfc6" strokeWidth="1"/>
      </g>
    ))}
  </svg>
);

export const CRITERIA_ICONS = {
  abolition_propriete_privee: <IconPropriete />,
  egalite_travail:            <IconHierarchie />,
  dissolution_etat:           <IconEtat />,
  horizon_mondial:            <IconMonde />,
};
