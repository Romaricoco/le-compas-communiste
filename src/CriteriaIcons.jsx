/* Icônes constructivistes pour les 4 aiguilles */

/* I — Propriété : usine collective avec étoile */
export const IconPropriete = () => (
  <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <rect x="1" y="19" width="30" height="12" stroke="currentColor" strokeWidth="2"/>
    <rect x="4" y="11" width="7" height="8" stroke="currentColor" strokeWidth="2"/>
    <rect x="16" y="14" width="5" height="5" stroke="currentColor" strokeWidth="2"/>
    <rect x="13" y="23" width="6" height="8" stroke="currentColor" strokeWidth="1.5"/>
    <polygon
      points="16,1 17.5,6 22.5,6 18.5,9 20,14 16,11 12,14 13.5,9 9.5,6 14.5,6"
      fill="currentColor"
    />
  </svg>
);

/* II — Hiérarchie : marteau et stylo à égalité */
export const IconHierarchie = () => (
  <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    {/* Ligne d'égalité */}
    <line x1="1" y1="19" x2="31" y2="19" stroke="currentColor" strokeWidth="2"/>
    {/* Marteau (gauche) */}
    <rect x="3" y="10" width="10" height="9" stroke="currentColor" strokeWidth="2"/>
    <line x1="8" y1="19" x2="8" y2="30" stroke="currentColor" strokeWidth="2.5"/>
    {/* Plume/crayon (droite) */}
    <polygon points="19,8 26,8 30,13 26,30 19,30 15,13" stroke="currentColor" strokeWidth="2" fill="none"/>
    <line x1="19" y1="25" x2="26" y2="25" stroke="currentColor" strokeWidth="1.5"/>
  </svg>
);

/* III — État : institution qui se dissout vers les communes */
export const IconEtat = () => (
  <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    {/* Bâtiment central */}
    <rect x="11" y="13" width="10" height="9" stroke="currentColor" strokeWidth="2"/>
    <polygon points="16,7 11,13 21,13" stroke="currentColor" strokeWidth="2" fill="none" strokeLinejoin="round"/>
    {/* Flèches en pointillés vers les communes */}
    <line x1="16" y1="7"  x2="16" y2="1"  stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 2"/>
    <line x1="21" y1="17" x2="31" y2="17" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 2"/>
    <line x1="11" y1="17" x2="1"  y2="17" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 2"/>
    <line x1="16" y1="22" x2="16" y2="31" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 2"/>
    {/* Communes */}
    <circle cx="16" cy="1"  r="1.5" fill="currentColor"/>
    <circle cx="31" cy="17" r="1.5" fill="currentColor"/>
    <circle cx="1"  cy="17" r="1.5" fill="currentColor"/>
    <circle cx="16" cy="31" r="1.5" fill="currentColor"/>
  </svg>
);

/* IV — Monde : globe avec étoile au pôle */
export const IconMonde = () => (
  <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <circle cx="16" cy="17" r="13" stroke="currentColor" strokeWidth="2"/>
    <ellipse cx="16" cy="17" rx="5.5" ry="13" stroke="currentColor" strokeWidth="1.5"/>
    <line x1="3"  y1="17" x2="29" y2="17" stroke="currentColor" strokeWidth="1.5"/>
    <line x1="5"  y1="11" x2="27" y2="11" stroke="currentColor" strokeWidth="1"/>
    <line x1="5"  y1="23" x2="27" y2="23" stroke="currentColor" strokeWidth="1"/>
    {/* Étoile pôle nord */}
    <polygon
      points="16,1 16.8,3.5 19.4,3.5 17.3,5 18.1,7.5 16,6 13.9,7.5 14.7,5 12.6,3.5 15.2,3.5"
      fill="currentColor"
    />
  </svg>
);

export const CRITERIA_ICONS = {
  abolition_propriete_privee: <IconPropriete />,
  egalite_travail:            <IconHierarchie />,
  dissolution_etat:           <IconEtat />,
  horizon_mondial:            <IconMonde />,
};
