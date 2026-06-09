const LAND = '#2a6e3a';
const ICE  = '#cce8ff';

function WorldMap({ dx = 0 }) {
  return (
    <g transform={`translate(${dx},0)`} strokeLinejoin="round" strokeLinecap="round">
      {/* Ocean */}
      <rect width="1000" height="500" fill="#0c2d6b"/>
      {/* ── Continents ── */}
      {/* North America */}
      <path fill={LAND} d="M30,52 L75,38 L118,28 L165,28 L208,33 L248,52 L272,78 L308,98 L332,112 L328,135 L318,158 L322,172 L305,190 L288,215 L268,230 L252,218 L238,202 L205,195 L178,162 L157,112 L118,80 L75,60 Z"/>
      {/* Greenland */}
      <path fill={LAND} d="M336,18 L390,12 L432,14 L458,20 L454,44 L440,62 L418,87 L392,90 L368,88 L342,73 Z"/>
      {/* Iceland */}
      <path fill={LAND} d="M466,65 L488,60 L498,68 L496,78 L480,83 L468,78 Z"/>
      {/* South America */}
      <path fill={LAND} d="M268,218 L298,212 L322,212 L358,225 L404,268 L410,310 L408,345 L395,398 L368,413 L342,413 L308,405 L288,382 L280,355 L268,312 L260,272 Z"/>
      {/* Europe */}
      <path fill={LAND} d="M468,48 L508,42 L548,40 L582,43 L612,55 L618,65 L605,78 L612,100 L614,128 L585,150 L562,158 L538,158 L510,153 L485,150 L462,143 L455,128 L462,110 L458,95 L472,80 Z"/>
      {/* UK */}
      <path fill={LAND} d="M474,95 L482,88 L492,92 L490,108 L478,112 Z"/>
      {/* Ireland */}
      <path fill={LAND} d="M463,98 L470,94 L472,104 L465,108 Z"/>
      {/* Scandinavia */}
      <path fill={LAND} d="M522,38 L540,30 L555,32 L558,50 L548,68 L535,75 L520,65 Z"/>
      {/* Africa */}
      <path fill={LAND} d="M452,138 L538,135 L578,138 L612,138 L648,183 L652,215 L640,255 L635,278 L618,305 L600,328 L572,355 L545,360 L520,358 L495,350 L470,330 L452,300 L444,262 L448,218 L450,178 Z"/>
      {/* Madagascar */}
      <path fill={LAND} d="M618,292 L632,280 L642,295 L640,315 L633,336 L618,323 Z"/>
      {/* Asia – main mass */}
      <path fill={LAND} d="M568,33 L650,30 L730,28 L820,28 L900,30 L960,33 L1000,35 L1000,45 L965,58 L942,68 L918,108 L916,123 L900,140 L883,153 L860,160 L852,163 L838,175 L822,190 L808,205 L795,218 L783,242 L768,208 L745,198 L723,193 L705,205 L680,213 L658,213 L635,205 L613,192 L607,155 L573,150 L568,120 L565,80 Z"/>
      {/* Arabia */}
      <path fill={LAND} d="M608,190 L635,185 L652,192 L660,215 L648,238 L632,252 L612,253 L598,238 L595,215 Z"/>
      {/* India */}
      <path fill={LAND} d="M712,190 L740,188 L758,198 L760,225 L748,255 L733,270 L718,265 L703,245 L698,218 Z"/>
      {/* Sri Lanka */}
      <path fill={LAND} d="M740,268 L748,262 L754,270 L748,280 L738,278 Z"/>
      {/* Japan */}
      <path fill={LAND} d="M930,143 L940,132 L950,138 L952,153 L943,162 L930,158 Z"/>
      {/* SE Asia – Malay peninsula */}
      <path fill={LAND} d="M785,242 L798,255 L804,278 L795,302 L782,306 L773,292 L768,270 L775,252 Z"/>
      {/* Borneo */}
      <path fill={LAND} d="M822,252 L858,243 L875,255 L873,280 L858,298 L835,303 L812,288 L808,265 Z"/>
      {/* Sumatra */}
      <path fill={LAND} d="M762,272 L800,255 L826,260 L835,278 L820,300 L793,308 L768,300 Z"/>
      {/* Java */}
      <path fill={LAND} d="M810,308 L858,300 L880,308 L875,320 L828,323 L808,316 Z"/>
      {/* New Guinea */}
      <path fill={LAND} d="M888,278 L930,265 L958,270 L968,285 L950,298 L912,302 L886,293 Z"/>
      {/* Australia */}
      <path fill={LAND} d="M818,302 L862,282 L896,278 L922,285 L934,302 L938,330 L932,355 L910,368 L878,368 L848,360 L822,348 L808,325 L812,308 Z"/>
      {/* Tasmania */}
      <path fill={LAND} d="M862,372 L873,367 L878,378 L870,386 L860,382 Z"/>
      {/* New Zealand */}
      <path fill={LAND} d="M958,355 L968,340 L977,352 L974,370 L963,374 Z"/>
      <path fill={LAND} d="M950,378 L960,372 L963,383 L955,390 Z"/>
      {/* Antarctica */}
      <path fill={ICE} d="M0,432 Q50,425 100,428 Q200,420 300,426 Q400,420 500,426 Q600,420 700,425 Q800,420 900,426 Q950,423 1000,428 L1000,500 L0,500 Z"/>
      {/* Arctic */}
      <path fill={ICE} d="M0,0 L1000,0 L1000,20 Q700,10 500,16 Q250,8 0,18 Z"/>
    </g>
  );
}

export default function SpaceGlobe() {
  return (
    <section className="space-hero">
      <div className="stars s1"/>
      <div className="stars s2"/>
      <div className="stars s3"/>
      <div className="nebula"/>
      <div className="earth-wrap">
        <div className="earth-atmo"/>
        <div className="earth-sphere">
          <div className="earth-track">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 2000 500"
              preserveAspectRatio="xMidYMid slice"
              style={{ width: '100%', height: '100%' }}
            >
              <WorldMap dx={0}/>
              <WorldMap dx={1000}/>
            </svg>
          </div>
          <div className="earth-clouds"/>
          <div className="earth-shade"/>
          <div className="earth-shine"/>
        </div>
      </div>
      <div className="space-legend">· Un seul monde ·</div>
    </section>
  );
}
