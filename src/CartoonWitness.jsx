import './CartoonWitness.css';

/* ══════════════════════════════════════════════════════════
   TÉMOIN EN APLATS — orateur de soviet, pas accusé de tribunal.
   Silhouettes redessinées d'après les illustrations validées par
   le camarade (encre noire, un accent rouge, vêtements distincts
   par personnage). Poings levés, doigts qui pointent, buste qui
   se penche : chaque prise de parole a sa gestuelle.
   ══════════════════════════════════════════════════════════ */

const PALETTE = {
  // châle rouge en diagonale, longue jupe/manteau — vétérane syndicaliste
  olga:  { skin: '#c9a582', hair: '#9c9a94', coat: '#e8e4dc', accent: '#a3151b', style: 'bun',     outfit: 'shawl' },
  // blouson de toile, bandana rouge au cou — jeune anarchiste
  diego: { skin: '#b47c50', hair: '#211a16', coat: '#d8d3c8', accent: '#a3151b', style: 'short',   outfit: 'denim' },
  // col officier, étoile rouge épinglée — organisatrice, matérialiste
  wei:   { skin: '#d9bd97', hair: '#100e0b', coat: '#dcd8d0', accent: '#a3151b', style: 'slick',   outfit: 'mao' },
  // long manteau, hijab, rouge sous le col — internationaliste
  amara: { skin: '#8f5a38', hair: '#1c1310', coat: '#e2ddd2', accent: '#a3151b', style: 'veil',    outfit: 'trench' },
  // brassard rouge, chemise ample — vétéran, docker noir britannique
  john:  { skin: '#6b4a33', hair: '#171310', coat: '#e6e2d8', accent: '#a3151b', style: 'short',   outfit: 'tunic' },
  // costume cravate rouge, carré au carré — intellectuelle
  greta: { skin: '#d9c2a4', hair: '#3a2a1c', coat: '#181614', accent: '#a3151b', style: 'bob',     outfit: 'suit' },
  // béret, chemise ample de syndicaliste — président de séance français
  romaric: { skin: '#d3ab86', hair: '#2c2118', coat: '#dfd9cc', accent: '#a3151b', style: 'beret', outfit: 'tunic' },
};

const SEED = { olga: 0, diego: 1, wei: 2, amara: 3, john: 4, greta: 5, romaric: 6 };

/* Gestuelles d'orateur — le bras droit pivote depuis l'épaule ;
   à -150° il passe au-dessus de la tête, poing serré. */
const POSES = ['fist', 'point', 'open', 'cross'];

const HEAD_PATH =
  'M67,118 C64,88 76,60 100,58 C124,60 136,88 133,118 ' +
  'C133,148 126,172 100,186 C74,172 67,148 67,118 Z';

function Hair({ p }) {
  const { hair, style } = p;
  switch (style) {
    case 'bun':
      return (
        <>
          <path d="M64,104 C60,66 78,44 100,44 C122,44 140,66 136,104 C136,80 122,64 100,64 C78,64 64,80 64,104 Z" fill={hair} />
          <circle cx="100" cy="38" r="12" fill={hair} />
        </>
      );
    case 'veil':
      return (
        <path d="M52,240 C46,140 60,54 100,48 C140,54 154,140 148,240 L148,258 C148,264 141,266 133,261 C124,282 76,282 67,261 C59,266 52,264 52,258 Z" fill="#e2ddd2" stroke="#0c0a08" />
      );
    case 'slick':
      /* cheveux tirés en arrière, stricts */
      return <path d="M64,110 C60,66 78,42 100,42 C122,42 140,66 136,110 C138,130 132,150 128,158 C132,130 126,96 100,94 C74,96 68,130 72,158 C68,150 62,130 64,110 Z" fill={hair} />;
    case 'beret':
      /* béret français, légèrement incliné, avec sa petite queue */
      return (
        <>
          <path d="M62,96 C58,64 76,44 100,44 C124,44 142,64 138,96 C136,74 122,60 100,60 C78,60 64,74 62,96 Z" fill={hair} />
          <ellipse cx="100" cy="58" rx="46" ry="16" fill="#26211c" />
          <circle cx="128" cy="52" r="4" fill="#26211c" />
        </>
      );
    case 'bob':
      return <path d="M63,120 C57,68 78,44 100,44 C122,44 143,68 137,120 C137,134 132,84 100,82 C68,84 63,134 63,120 Z" fill={hair} />;
    case 'short':
    default:
      return <path d="M66,98 C63,62 80,46 100,46 C120,46 137,62 134,98 C134,80 120,68 100,68 C80,68 66,80 66,98 Z" fill={hair} />;
  }
}

function Eye({ cx }) {
  return (
    <g className="cw-eyes">
      <path d={`M${cx - 12},0 Q${cx},-6 ${cx + 12},0 Q${cx},6 ${cx - 12},0 Z`} fill="#e9ddc8" stroke="none" />
      <circle cx={cx} cy="0" r="4.6" fill="#1a1310" stroke="none" />
      <path className="cw-ink" d={`M${cx - 13},-1 Q${cx},-9 ${cx + 13},-1`} fill="none" strokeLinecap="round" />
    </g>
  );
}

/* Main : poing serré (lutte), doigt qui pointe (accusation), ou
   main ouverte (appel à la salle) */
function Hand({ cx, cy, skin, gesture }) {
  if (gesture === 'fist') {
    return (
      <g>
        <rect x={cx - 11} y={cy - 10} width="22" height="21" rx="7" fill={skin} />
        <path className="cw-ink" d={`M${cx - 8},${cy - 2} L${cx + 8},${cy - 2}`} fill="none" strokeWidth="1.8" />
        <path className="cw-ink" d={`M${cx - 8},${cy + 4} L${cx + 8},${cy + 4}`} fill="none" strokeWidth="1.8" />
      </g>
    );
  }
  if (gesture === 'point') {
    return (
      <g>
        <ellipse cx={cx - 2} cy={cy + 3} rx="9" ry="8" fill={skin} />
        <rect x={cx - 4} y={cy - 22} width="8" height="24" rx="4" fill={skin} />
      </g>
    );
  }
  return <circle cx={cx} cy={cy} r="10" fill={skin} />;
}

/* Le buste : silhouette et détails distincts par vêtement, chacun
   avec son unique accent rouge (foulard, étoile, cravate, brassard). */
function Outfit({ p }) {
  switch (p.outfit) {
    case 'denim':
      return (
        <>
          <path d="M22,340 C18,244 38,202 100,196 C162,202 182,244 178,340 Z" fill={p.coat} />
          {/* poches plaquées */}
          <path d="M44,250 L70,250 L68,278 L42,278 Z" fill="none" className="cw-ink" strokeWidth="1.6" />
          <path d="M130,250 L156,250 L158,278 L132,278 Z" fill="none" className="cw-ink" strokeWidth="1.6" />
          <path d="M100,196 L100,340" fill="none" className="cw-ink" strokeWidth="1.4" />
          {/* bandana rouge noué au cou */}
          <path d="M76,196 C76,208 124,208 124,196 L128,214 C110,222 90,222 72,214 Z" fill={p.accent} />
        </>
      );
    case 'mao':
      return (
        <>
          <path d="M22,340 C18,244 38,202 100,196 C162,202 182,244 178,340 Z" fill={p.coat} />
          {/* col officier droit */}
          <path d="M80,196 L120,196 L124,214 L76,214 Z" fill={p.coat} className="cw-ink" />
          {/* rangée de boutons */}
          {[214, 236, 258, 280, 302].map(y => (
            <circle key={y} cx="100" cy={y} r="2.6" fill="none" className="cw-ink" strokeWidth="1.3" />
          ))}
          {/* étoile rouge épinglée */}
          <path d="M100,222 l3.5,7.2 8,0.9 -5.8,5.4 1.5,7.9 -7.2,-4 -7.2,4 1.5,-7.9 -5.8,-5.4 8,-0.9 Z" fill={p.accent} />
        </>
      );
    case 'trench':
      return (
        <>
          <path d="M20,340 C16,240 40,198 100,192 C160,198 184,240 180,340 Z" fill={p.coat} />
          {/* revers longs de manteau croisé */}
          <path d="M100,198 L74,236 L82,340 L100,340 Z" fill="none" className="cw-ink" strokeWidth="1.6" />
          <path d="M100,198 L126,236 L118,340 L100,340 Z" fill="none" className="cw-ink" strokeWidth="1.6" />
          {/* col rouge qui dépasse */}
          <path d="M86,198 C86,210 114,210 114,198 L114,206 C114,214 86,214 86,206 Z" fill={p.accent} />
        </>
      );
    case 'tunic':
      return (
        <>
          {/* chemise ample, pas de ceinture ni col serré */}
          <path d="M26,340 C22,246 40,204 100,198 C160,204 178,246 174,340 Z" fill={p.coat} />
          <path d="M100,198 L100,340" fill="none" className="cw-ink" strokeWidth="1.2" />
          {/* poche poitrine */}
          <path d="M120,222 L142,222 L142,244 L120,244 Z" fill="none" className="cw-ink" strokeWidth="1.5" />
          {/* brassard rouge sur le bras gauche (arrière) */}
          <rect x="14" y="252" width="30" height="16" fill={p.accent} transform="rotate(-8 29 260)" />
        </>
      );
    case 'suit':
      return (
        <>
          <path d="M20,340 C16,240 40,198 100,192 C160,198 184,240 180,340 Z" fill={p.coat} />
          {/* revers de veston */}
          <path d="M100,198 L78,222 L88,340 L100,340 Z" fill="#100e0c" className="cw-ink" />
          <path d="M100,198 L122,222 L112,340 L100,340 Z" fill="#100e0c" className="cw-ink" />
          {/* chemise blanche visible */}
          <path d="M90,204 L100,240 L110,204 L100,198 Z" fill="#e9e5da" className="cw-ink" strokeWidth="1.4" />
          {/* cravate rouge */}
          <path d="M96,212 L104,212 L108,270 L100,282 L92,270 Z" fill={p.accent} />
        </>
      );
    default:
      return <path d="M22,340 C18,244 38,202 100,196 C162,202 182,244 178,340 Z" fill={p.coat} />;
  }
}

export default function CartoonWitness({ memberId, speaking = false, pose = 0 }) {
  const p = PALETTE[memberId] || PALETTE.olga;
  const seed = SEED[memberId] || 0;
  const gesture = POSES[pose % POSES.length];
  const idleDur = (3.4 + (seed % 4) * 0.42).toFixed(2);
  const gestureDur = (0.62 + (seed % 3) * 0.09).toFixed(2);
  const blinkDelay = (1.2 + seed * 0.9).toFixed(2);

  return (
    <svg
      viewBox="0 0 200 340"
      className={'cw-fig' + (speaking ? ' cw-speaking' : '') + ' cw-pose-' + gesture}
      style={{ '--cw-idle': idleDur + 's', '--cw-gest': gestureDur + 's', '--cw-blink': blinkDelay + 's' }}
    >
      <g className="cw-body">
        {/* bras gauche (arrière) */}
        <g className="cw-arm cw-arm-l" style={{ transformBox: 'view-box', transformOrigin: '34px 210px' }}>
          <path d="M34,210 C16,224 8,256 10,292 C10,302 22,304 24,294 C26,260 32,232 44,214 Z" fill={p.coat} />
          <circle cx="12" cy="298" r="9" fill={p.skin} stroke="none" />
        </g>

        {/* torse habillé */}
        <Outfit p={p} />

        {/* bras droit : celui qui harangue — pivote depuis l'épaule,
            jusqu'au-dessus de la tête pour le poing levé */}
        <g className="cw-arm cw-arm-r" style={{ transformBox: 'view-box', transformOrigin: '160px 214px' }}>
          <path d="M160,214 C176,226 186,254 184,288 C183,298 171,299 169,289 C166,258 160,234 150,218 Z" fill={p.coat} />
          <Hand cx={176} cy={292} skin={p.skin} gesture={gesture} />
        </g>

        {/* cou */}
        <path d="M88,172 L112,172 L112,206 C112,212 88,212 88,206 Z" fill={p.skin} />
        <path d="M88,178 C94,186 106,186 112,178 L112,188 C106,196 94,196 88,188 Z" fill="#000" opacity="0.18" stroke="none" />

        {/* tête */}
        <g className="cw-head" style={{ transformBox: 'view-box', transformOrigin: '100px 180px' }}>
          {p.style !== 'veil' && p.style !== 'bob' && p.style !== 'beret' && <Hair p={p} />}
          <path d={HEAD_PATH} fill={p.skin} />
          {(p.style === 'bob' || p.style === 'beret') && <Hair p={p} />}

          {/* ombre directionnelle : un côté du visage dans la pénombre */}
          <path d="M100,58 C124,60 136,88 133,118 C133,148 126,172 100,186 Z" fill="#000" opacity="0.14" stroke="none" />

          {/* sourcils froncés */}
          <path className="cw-ink" d="M72,102 q11,-8 22,-3" fill="none" strokeLinecap="round" />
          <path className="cw-ink" d="M128,102 q-11,-8 -22,-3" fill="none" strokeLinecap="round" />

          <g transform="translate(84,116)"><Eye cx={0} /></g>
          <g transform="translate(116,116)"><Eye cx={0} /></g>

          <path className="cw-ink" d="M100,118 L96,140 Q100,144 104,140" fill="none" strokeLinecap="round" strokeWidth="2" />

          <rect className="cw-mouth" x="86" y="152" width="28" height="4" rx="2" fill="#2a140f" stroke="none" />

          {p.style === 'veil' && (
            <path d="M52,150 C46,104 64,50 100,44 C136,50 154,104 148,150 C148,116 130,68 100,66 C70,68 52,116 52,150 Z" fill="#e2ddd2" className="cw-ink" />
          )}
        </g>
      </g>
    </svg>
  );
}
