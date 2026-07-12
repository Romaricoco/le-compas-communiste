import './CartoonWitness.css';

/* ══════════════════════════════════════════════════════════
   TÉMOIN EN APLATS — personnage dessiné, vraiment articulé
   (tête, épaules, bras) plutôt qu'une photo plaquée sur un
   rectangle. Proportions adultes, traits d'encre, un accent
   rouge par personnage.
   ══════════════════════════════════════════════════════════ */

const PALETTE = {
  olga:  { skin: '#c9a582', hair: '#9c9a94', coat: '#2e2925', scarf: '#8c1216', style: 'bun' },
  diego: { skin: '#b47c50', hair: '#211a16', coat: '#2b2b2e', scarf: '#8c1216', style: 'short' },
  wei:   { skin: '#d9bd97', hair: '#100e0b', coat: '#24282e', scarf: null,      style: 'straight' },
  amara: { skin: '#8f5a38', hair: '#1c1310', coat: '#33191b', scarf: '#7c1116', style: 'veil' },
  john:  { skin: '#6b4a33', hair: '#171310', coat: '#2c2b24', scarf: null,      style: 'short' },
  greta: { skin: '#d9c2a4', hair: '#6e3d17', coat: '#26212c', scarf: null,      style: 'bob', glasses: true },
};

const SEED = { olga: 0, diego: 1, wei: 2, amara: 3, john: 4, greta: 5 };

/* Tête : ovale tapered vers le menton, proportions adultes
   (largeur ~66, hauteur ~92) — pas une pomme ronde. */
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
        <path d="M52,240 C46,140 60,54 100,48 C140,54 154,140 148,240 L148,258 C148,264 141,266 133,261 C124,282 76,282 67,261 C59,266 52,264 52,258 Z" fill={p.scarf} />
      );
    case 'straight':
      return <path d="M62,112 C58,64 78,42 100,42 C122,42 142,64 138,112 C138,144 132,100 100,98 C68,100 62,144 62,112 Z" fill={hair} />;
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

export default function CartoonWitness({ memberId, speaking = false }) {
  const p = PALETTE[memberId] || PALETTE.olga;
  const seed = SEED[memberId] || 0;
  const idleDur = (3.4 + (seed % 4) * 0.42).toFixed(2);
  const gestureDur = (0.62 + (seed % 3) * 0.09).toFixed(2);
  const blinkDelay = (1.2 + seed * 0.9).toFixed(2);

  return (
    <svg
      viewBox="0 0 200 340"
      className={'cw-fig' + (speaking ? ' cw-speaking' : '')}
      style={{ '--cw-idle': idleDur + 's', '--cw-gest': gestureDur + 's', '--cw-blink': blinkDelay + 's' }}
    >
      <g className="cw-body">
        {/* bras gauche (arrière) */}
        <g className="cw-arm cw-arm-l" style={{ transformBox: 'view-box', transformOrigin: '34px 210px' }}>
          <path d="M34,210 C16,224 8,256 10,292 C10,302 22,304 24,294 C26,260 32,232 44,214 Z" fill={p.coat} />
          <circle cx="12" cy="298" r="9" fill={p.skin} stroke="none" />
        </g>

        {/* torse */}
        <path d="M22,340 C18,244 38,202 100,196 C162,202 182,244 178,340 Z" fill={p.coat} />
        {p.scarf && p.style !== 'veil' && (
          <path d="M78,203 C78,214 122,214 122,203 L122,218 C122,227 78,227 78,218 Z" fill={p.scarf} />
        )}

        {/* bras droit (avant, celui qui gesticule) */}
        <g className="cw-arm cw-arm-r" style={{ transformBox: 'view-box', transformOrigin: '166px 210px' }}>
          <path d="M166,210 C184,222 194,252 192,286 C191,296 179,297 177,287 C174,256 168,230 156,214 Z" fill={p.coat} />
          <circle cx="188" cy="290" r="9" fill={p.skin} stroke="none" />
        </g>

        {/* cou */}
        <path d="M88,172 L112,172 L112,206 C112,212 88,212 88,206 Z" fill={p.skin} />
        {/* ombre de mâchoire sur le cou */}
        <path d="M88,178 C94,186 106,186 112,178 L112,188 C106,196 94,196 88,188 Z" fill="#000" opacity="0.18" stroke="none" />

        {/* tête */}
        <g className="cw-head" style={{ transformBox: 'view-box', transformOrigin: '100px 180px' }}>
          {p.style !== 'veil' && p.style !== 'bob' && <Hair p={p} />}
          <path d={HEAD_PATH} fill={p.skin} />
          {p.style === 'bob' && <Hair p={p} />}

          {/* ombre directionnelle : un seul côté du visage dans la pénombre */}
          <path d="M100,58 C124,60 136,88 133,118 C133,148 126,172 100,186 Z" fill="#000" opacity="0.14" stroke="none" />

          {/* sourcils froncés */}
          <path className="cw-ink" d="M72,102 q11,-8 22,-3" fill="none" strokeLinecap="round" />
          <path className="cw-ink" d="M128,102 q-11,-8 -22,-3" fill="none" strokeLinecap="round" />

          {/* yeux */}
          <g transform="translate(84,116)"><Eye cx={0} /></g>
          <g transform="translate(116,116)"><Eye cx={0} /></g>

          {/* arête du nez */}
          <path className="cw-ink" d="M100,118 L96,140 Q100,144 104,140" fill="none" strokeLinecap="round" strokeWidth="2" />

          {p.glasses && (
            <g className="cw-ink" fill="none">
              <rect x="70" y="106" width="26" height="19" rx="5" />
              <rect x="104" y="106" width="26" height="19" rx="5" />
              <line x1="96" y1="114" x2="104" y2="114" />
            </g>
          )}

          {/* bouche : parle */}
          <rect className="cw-mouth" x="86" y="152" width="28" height="4" rx="2" fill="#2a140f" stroke="none" />

          {p.style === 'veil' && (
            <path d="M52,150 C46,104 64,50 100,44 C136,50 154,104 148,150 C148,116 130,68 100,66 C70,68 52,116 52,150 Z" fill={p.scarf} />
          )}
        </g>
      </g>
    </svg>
  );
}
