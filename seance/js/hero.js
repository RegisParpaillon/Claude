// Illustration « athlète en salle » style anime (dessin vectoriel original).
// L'aura et les éclairs évoluent avec le rang.

const OL = '#1b1d3a';                        // contour
const SK = '#f0b58a', SK2 = '#d38c62', SK3 = '#ffd6b3';   // peau : base, ombre, reflet
const NV = '#252a63', NV2 = '#161a42', NV3 = '#3b4396';   // textile marine
const HR = '#3b2417', HR2 = '#24150d', HR3 = '#6b4128';   // cheveux

function gym(rank, id) {
  const lights = [60, 200, 340].map(x => `
    <rect x="${x - 50}" y="46" width="100" height="10" rx="3" fill="#fff" />
    <rect x="${x - 50}" y="56" width="100" height="5" fill="${rank.color}" opacity=".9"/>
    <path d="M${x - 50},61 L${x - 70},120 L${x + 70},120 L${x + 50},61Z" fill="#fff" opacity=".08"/>`).join('');
  const plate = (cx, cy, r) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#2a2f6e" stroke="${OL}" stroke-width="2.5"/><circle cx="${cx}" cy="${cy}" r="${r * .55}" fill="none" stroke="#454eaa" stroke-width="2"/><circle cx="${cx}" cy="${cy}" r="${r * .15}" fill="#8a93e6"/>`;
  return `
  <rect width="400" height="440" fill="url(#${id}wall)"/>
  <rect width="400" height="62" fill="#262a63"/>
  ${lights}
  <rect y="62" width="400" height="6" fill="#1b1e4a"/>
  <!-- rack à gauche -->
  <g stroke="${OL}" stroke-width="2.5">
    <rect x="14" y="120" width="12" height="230" fill="#6d78d6"/>
    <rect x="86" y="120" width="12" height="230" fill="#6d78d6"/>
    <rect x="10" y="116" width="92" height="10" fill="#8791e8"/>
    <rect x="24" y="210" width="64" height="7" fill="#5a64c4"/>
    <rect x="0" y="196" width="118" height="6" fill="#c9cdf3"/>
  </g>
  ${plate(6, 199, 26)}${plate(112, 199, 26)}
  <!-- banc -->
  <g stroke="${OL}" stroke-width="2.5">
    <rect x="0" y="300" width="120" height="16" rx="4" fill="#3d4699"/>
    <rect x="16" y="316" width="9" height="42" fill="#6d78d6"/><rect x="96" y="316" width="9" height="42" fill="#6d78d6"/>
  </g>
  <!-- poulie / pile de poids à droite -->
  <g stroke="${OL}" stroke-width="2.5">
    <rect x="318" y="110" width="11" height="250" fill="#6d78d6"/>
    <rect x="382" y="110" width="11" height="250" fill="#6d78d6"/>
    <rect x="314" y="104" width="84" height="10" fill="#8791e8"/>
    <rect x="334" y="270" width="42" height="80" fill="#2a2f6e"/>
    <path d="M334,286 h42 M334,302 h42 M334,318 h42 M334,334 h42" stroke="#454eaa"/>
    <circle cx="355" cy="124" r="7" fill="#c9cdf3"/>
    <path d="M355,131 L355,270" stroke="#c9cdf3" stroke-width="2"/>
    <rect x="296" y="210" width="26" height="7" fill="#5a64c4"/>
  </g>
  ${plate(300, 214, 18)}
  <!-- sol -->
  <path d="M0,350 L400,350 L400,440 L0,440Z" fill="url(#${id}floor)"/>
  <path d="M0,350 L400,350" stroke="#8a93e6" stroke-width="3"/>
  <path d="M200,350 L120,440 M200,350 L280,440 M200,350 L40,440 M200,350 L360,440" stroke="#5f68c0" stroke-width="1.5" opacity=".5"/>
  <ellipse cx="200" cy="428" rx="120" ry="12" fill="#1b1d3a" opacity=".35"/>`;
}

function speed(rank) {
  const out = [];
  const N = 16 + rank.index * 3;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2 + (i % 3) * .07;
    const r0 = 150 + (i * 37 % 40), r1 = r0 + 30 + (i * 17 % 50);
    const x0 = 200 + Math.cos(a) * r0, y0 = 230 + Math.sin(a) * r0 * 1.05;
    const x1 = 200 + Math.cos(a) * r1, y1 = 230 + Math.sin(a) * r1 * 1.05;
    out.push(`<path d="M${x0.toFixed(1)},${y0.toFixed(1)} L${x1.toFixed(1)},${y1.toFixed(1)}" stroke="${i % 2 ? '#fff' : '#ffe58a'}" stroke-width="${2 + i % 3}" stroke-linecap="round" opacity=".85"/>`);
  }
  return out.join('');
}

function bolt(x, y, s, color, rot = 0) {
  return `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})">
    <path d="M0,0 L10,18 L4,20 L16,40 L2,24 L8,22 Z" fill="${color}" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/></g>`;
}

export function heroSvg(rank, opts = {}) {
  const id = 'h' + Math.random().toString(36).slice(2, 7);
  const au = rank.color;
  const lvl = rank.index;
  const bolts = [
    bolt(64, 120, .9, au, -15), bolt(318, 112, .9, au, 15), bolt(118, 250, .8, au, -20), bolt(270, 250, .8, au, 20),
    bolt(60, 196, .7, au, -30), bolt(330, 196, .7, au, 30), bolt(120, 340, .6, au, -10), bolt(266, 340, .6, au, 10),
  ].slice(0, 2 + lvl).join('');
  return `<svg viewBox="0 0 400 440" class="avatar hero ${opts.cls || ''}" role="img" aria-label="Athlète style manga, rang ${rank.letter}">
  <defs>
    <linearGradient id="${id}wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f4f5ff"/><stop offset="1" stop-color="#d9ddfa"/></linearGradient>
    <linearGradient id="${id}floor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4c55ad"/><stop offset="1" stop-color="#2d3278"/></linearGradient>
    <radialGradient id="${id}aura" cx="50%" cy="50%" r="50%"><stop offset=".55" stop-color="${au}" stop-opacity="0"/><stop offset=".8" stop-color="${au}" stop-opacity="${.25 + lvl * .07}"/><stop offset="1" stop-color="${au}" stop-opacity="0"/></radialGradient>
    <filter id="${id}glow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="${3 + lvl}" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>
  ${gym(rank, id)}
  <ellipse cx="200" cy="240" rx="${150 + lvl * 6}" ry="${200 + lvl * 6}" fill="url(#${id}aura)"/>
  ${speed(rank)}
  <g filter="url(#${id}glow)">
    <path d="M200,62 C130,70 104,150 112,240 C118,330 150,410 200,428 C250,410 282,330 288,240 C296,150 270,70 200,62Z" fill="none" stroke="${au}" stroke-width="${2 + lvl * .6}" opacity="${.35 + lvl * .08}"/>
  </g>

  <!-- ===== Athlète : pose double biceps ===== -->
  <g stroke="${OL}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round">
    <!-- moitié gauche (dupliquée en miroir pour la droite) -->
    <g id="${id}half">
      <!-- jambe -->
      <path d="M160,318 C150,334 146,352 152,372 C146,388 150,402 160,414 L186,414 C186,400 188,388 190,376 C194,358 196,340 198,320Z" fill="${SK}"/>
      <path d="M156,340 C154,352 156,362 162,370 M158,384 C156,394 158,404 162,410" fill="none" stroke="${SK2}" stroke-width="5" opacity=".75"/>
      <path d="M162,368 C168,376 178,378 186,372" fill="none" stroke-width="2"/>
      <path d="M180,330 C184,344 184,356 182,366" fill="none" stroke="${SK3}" stroke-width="3" opacity=".9"/>
      <path d="M160,406 L187,406 L187,416 L160,416Z" fill="#fff"/>
      <path d="M158,414 C146,416 136,422 136,430 L190,432 C192,424 190,418 188,414Z" fill="${NV}"/>
      <path d="M136,430 L190,432 L190,436 L136,435Z" fill="#e8eaff"/>
      <!-- avant-bras levé -->
      <path d="M90,178 C80,160 80,132 90,112 L114,112 C116,134 112,156 108,170Z" fill="${SK}"/>
      <path d="M90,166 C86,148 86,132 92,118" fill="none" stroke="${SK2}" stroke-width="5" opacity=".75"/>
      <path d="M106,124 C108,138 106,152 102,164" fill="none" stroke="${SK3}" stroke-width="3" opacity=".9"/>
      <!-- poing -->
      <path d="M88,114 C84,100 90,88 102,86 C114,86 120,94 118,106 C118,114 110,118 100,118 C94,118 90,118 88,114Z" fill="${SK}"/>
      <path d="M94,94 C100,92 108,92 114,96 M92,102 C100,100 108,100 116,104" fill="none" stroke-width="2"/>
      <!-- bras : biceps contracté -->
      <path d="M152,150 C140,134 116,128 100,140 C92,148 88,162 92,180 C110,186 132,184 152,178Z" fill="${SK}"/>
      <path d="M104,144 C114,136 130,136 140,144" fill="none" stroke="${SK3}" stroke-width="4" opacity=".95"/>
      <path d="M96,170 C112,176 132,176 148,170" fill="none" stroke="${SK2}" stroke-width="5" opacity=".75"/>
      <path d="M118,150 C120,158 120,164 118,170" fill="none" stroke-width="2"/>
      <!-- épaule -->
      <path d="M170,146 C152,140 136,146 132,160 C134,174 146,182 160,182 C166,170 170,158 170,146Z" fill="${SK}"/>
      <path d="M140,156 C144,150 152,148 160,150" fill="none" stroke="${SK3}" stroke-width="3.5"/>
      <!-- flanc / dorsal -->
      <path d="M160,180 C152,196 156,214 164,230 C166,246 166,258 166,272 L200,272 L200,180Z" fill="${SK}"/>
      <path d="M162,196 C160,210 164,222 168,232" fill="none" stroke="${SK2}" stroke-width="5" opacity=".75"/>
    </g>
    <use href="#${id}half" transform="matrix(-1 0 0 1 400 0)"/>

    <path d="M166,144 L234,144 L238,172 L162,172Z" fill="${SK}" stroke="none"/>
    <!-- short -->
    <path d="M164,266 L236,266 L248,324 L206,328 L200,304 L194,328 L152,324Z" fill="${NV}"/>
    <path d="M200,280 L200,304 M160,308 L188,312 M240,308 L212,312" fill="none" stroke="${NV2}" stroke-width="2.5"/>
    <path d="M164,266 L236,266 L237,275 L163,275Z" fill="${NV3}"/>
    <!-- débardeur -->
    <path d="M172,142 C180,156 190,162 200,162 C210,162 220,156 228,142 L240,148 C236,170 238,186 242,198 C238,222 236,248 236,268 L164,268 C164,248 162,222 158,198 C162,186 164,170 160,148Z" fill="${NV}"/>
    <path d="M166,152 C170,172 170,186 166,198" fill="none" stroke="${NV3}" stroke-width="4"/>
    <path d="M200,176 C190,194 178,198 166,196 M200,176 C210,194 222,198 234,196" fill="none" stroke="${NV2}" stroke-width="2.5"/>
    <path d="M200,200 L200,262 M184,226 C194,230 206,230 216,226 M186,248 C196,252 204,252 214,248" fill="none" stroke="${NV2}" stroke-width="2"/>
    <path d="M232,170 C232,200 230,230 230,262" fill="none" stroke="${NV2}" stroke-width="6" opacity=".7"/>
    <text x="200" y="${rank.letter.length > 1 ? 220 : 224}" text-anchor="middle" font-size="${rank.letter.length > 2 ? 15 : rank.letter.length > 1 ? 20 : 26}" font-weight="900" font-style="italic" fill="${au}" stroke="${OL}" stroke-width="1" font-family="Impact, Arial Black, sans-serif">${rank.letter}</text>
    <!-- cou et trapèzes -->
    <path d="M184,124 L216,124 L218,146 L182,146Z" fill="${SK}"/>
    <path d="M182,138 C176,142 172,146 168,148 L176,150 C184,146 190,146 192,146 M218,138 C224,142 228,146 232,148 L224,150 C216,146 210,146 208,146" fill="${SK}"/>
    <path d="M186,140 C194,146 206,146 214,140" fill="none" stroke="${SK2}" stroke-width="3"/>
  </g>

  <g transform="translate(200 150) scale(1.12) translate(-200 -150)">
  <!-- tête -->
  <g stroke="${OL}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round">
    <path d="M169,98 C164,90 158,92 158,100 C158,110 164,116 171,114Z M231,98 C236,90 242,92 242,100 C242,110 236,116 229,114Z" fill="${SK}"/>
    <path d="M170,84 C168,104 174,122 186,132 C192,137 196,139 200,139 C204,139 208,137 214,132 C226,122 232,104 230,84 C230,64 218,52 200,52 C182,52 170,64 170,84Z" fill="${SK}"/>
    <path d="M174,112 C180,124 190,132 200,135" fill="none" stroke="${SK2}" stroke-width="4" opacity=".7"/>
    <!-- cheveux en mèches -->
    <path d="M164,100 C154,82 158,56 172,44 C168,32 178,24 190,28 C196,16 214,14 220,26 C232,22 246,32 242,46 C254,56 252,80 238,100 L234,84 L228,94 L226,74 L216,92 L212,70 L202,90 L196,68 L188,92 L184,70 L176,90 L172,80 L168,96Z" fill="${HR}"/>
    <path d="M176,42 L160,30 L180,36 M228,30 L244,18 L240,38 M244,52 L258,52 L246,66 M160,56 L146,58 L160,70" fill="${HR}"/>
    <path d="M182,40 C190,36 200,36 208,40 M214,32 C224,32 232,38 234,46" fill="none" stroke="${HR3}" stroke-width="3.5"/>
    <path d="M238,62 C242,72 242,84 238,92 M164,64 C162,74 164,84 166,92" fill="none" stroke="${HR2}" stroke-width="3"/>
    <!-- sourcils -->
    <path d="M176,94 L196,100 L195,104 L176,99Z M224,94 L204,100 L205,104 L224,99Z" fill="${HR2}" stroke-width="2"/>
  </g>
  <!-- yeux -->
  <g stroke-linecap="round">
    <path d="M177,107 C183,101 192,102 197,108 C193,115 183,116 177,110Z" fill="#fff" stroke="${OL}" stroke-width="1.8"/>
    <ellipse cx="188.5" cy="109" rx="4.4" ry="5.6" fill="#8a5420"/><ellipse cx="188.5" cy="109.5" rx="2.3" ry="3.2" fill="${OL}"/>
    <circle cx="187" cy="106.6" r="1.5" fill="#fff"/><circle cx="190.5" cy="112" r=".8" fill="#fff"/>
    <path d="M175,107 C182,100 192,100 198,107" fill="none" stroke="${OL}" stroke-width="3.6"/>
    <path d="M223,107 C217,101 208,102 203,108 C207,115 217,116 223,110Z" fill="#fff" stroke="${OL}" stroke-width="1.8"/>
    <ellipse cx="211.5" cy="109" rx="4.4" ry="5.6" fill="#8a5420"/><ellipse cx="211.5" cy="109.5" rx="2.3" ry="3.2" fill="${OL}"/>
    <circle cx="210" cy="106.6" r="1.5" fill="#fff"/><circle cx="213.5" cy="112" r=".8" fill="#fff"/>
    <path d="M225,107 C218,100 208,100 202,107" fill="none" stroke="${OL}" stroke-width="3.6"/>
    <path d="M200,112 L197,121 L201,122" fill="none" stroke="${SK2}" stroke-width="2"/>
    <path d="M191,128 C196,131 204,131 209,127" fill="none" stroke="${OL}" stroke-width="2.4"/>
    <path d="M182,119 l5,-2 M213,117 l5,2" stroke="#e8846a" stroke-width="1.8"/>
  </g>
  <!-- sueur -->
  <path d="M152,90 C147,99 147,104 152,106 C157,104 157,99 152,90Z M250,108 C245,117 245,122 250,124 C255,122 255,117 250,108Z" fill="#bfe8ff" stroke="${OL}" stroke-width="1.5"/>
  </g>
  ${bolts}
</svg>`;
}
