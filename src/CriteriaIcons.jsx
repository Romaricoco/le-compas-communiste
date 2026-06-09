const Flag = () => (
  <svg viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"
    style={{ width: 44, height: 44 }}>
    <rect width="52" height="52" rx="4" fill="#1a3a6e"/>
    <line x1="13" y1="8" x2="13" y2="44" stroke="#e8e8f0" strokeWidth="2.5" strokeLinecap="round"/>
    <path d="M13 12 L38 12 L32 22 L38 32 L13 32 Z" fill="#cc2200"/>
  </svg>
);

export const IconPropriete  = () => <Flag />;
export const IconHierarchie = () => <Flag />;
export const IconEtat       = () => <Flag />;
export const IconMonde      = () => <Flag />;

export const CRITERIA_ICONS = {
  abolition_propriete_privee: <IconPropriete />,
  egalite_travail:            <IconHierarchie />,
  dissolution_etat:           <IconEtat />,
  horizon_mondial:            <IconMonde />,
};
