const Icon = ({ children }) => (
  <svg viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"
    style={{ width: 52, height: 52 }}>
    {children}
  </svg>
);

export const IconPropriete = () => (
  <Icon>
    <rect x="8" y="20" width="44" height="28" rx="2" stroke="#e8e8f0" strokeWidth="2.5"/>
    <path d="M20 20 V14 A10 10 0 0 1 40 14 V20" stroke="#e8e8f0" strokeWidth="2.5" strokeLinecap="round"/>
    <circle cx="30" cy="34" r="5" stroke="#cc2200" strokeWidth="2.5"/>
    <line x1="30" y1="39" x2="30" y2="44" stroke="#cc2200" strokeWidth="2.5" strokeLinecap="round"/>
  </Icon>
);

export const IconHierarchie = () => (
  <Icon>
    <circle cx="30" cy="12" r="7" stroke="#e8e8f0" strokeWidth="2.5"/>
    <line x1="30" y1="19" x2="30" y2="34" stroke="#e8e8f0" strokeWidth="2.5" strokeLinecap="round"/>
    <line x1="30" y1="28" x2="18" y2="38" stroke="#e8e8f0" strokeWidth="2.5" strokeLinecap="round"/>
    <line x1="30" y1="28" x2="42" y2="38" stroke="#e8e8f0" strokeWidth="2.5" strokeLinecap="round"/>
    <line x1="30" y1="34" x2="22" y2="48" stroke="#e8e8f0" strokeWidth="2.5" strokeLinecap="round"/>
    <line x1="30" y1="34" x2="38" y2="48" stroke="#e8e8f0" strokeWidth="2.5" strokeLinecap="round"/>
    <line x1="12" y1="42" x2="48" y2="42" stroke="#cc2200" strokeWidth="1.5" strokeDasharray="3 3"/>
  </Icon>
);

export const IconEtat = () => (
  <Icon>
    <polygon points="30,6 54,52 6,52" stroke="#e8e8f0" strokeWidth="2.5" fill="none" strokeLinejoin="round"/>
    <polygon points="30,12 33,20 41,20 35,25 37,33 30,28 23,33 25,25 19,20 27,20"
      fill="#cc2200"/>
  </Icon>
);

export const IconMonde = () => (
  <Icon>
    <circle cx="30" cy="30" r="22" stroke="#e8e8f0" strokeWidth="2.5"/>
    <ellipse cx="30" cy="30" rx="11" ry="22" stroke="#e8e8f0" strokeWidth="1.5"/>
    <line x1="8" y1="30" x2="52" y2="30" stroke="#e8e8f0" strokeWidth="1.5"/>
    <line x1="12" y1="18" x2="48" y2="18" stroke="#e8e8f0" strokeWidth="1"/>
    <line x1="12" y1="42" x2="48" y2="42" stroke="#e8e8f0" strokeWidth="1"/>
  </Icon>
);

export const CRITERIA_ICONS = {
  abolition_propriete_privee: <IconPropriete />,
  egalite_travail:            <IconHierarchie />,
  dissolution_etat:           <IconEtat />,
  horizon_mondial:            <IconMonde />,
};
