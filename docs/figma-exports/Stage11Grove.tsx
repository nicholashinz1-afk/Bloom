export function Stage11Grove({ viewBox = "200 260" }: { viewBox?: string }) {
  const [w, h] = viewBox.split(' ').map(Number);
  const s = w / 200;

  const grassTufts = [
    [5, 148, 6, -2], [25, 147, 5, 2], [50, 149, 7, -3],
    [80, 148, 6, 2], [110, 150, 5, -1], [140, 149, 7, 3],
    [160, 148, 6, -2], [180, 147, 5, 1], [195, 148, 6, 2]
  ];

  const motes = [
    [30, 100, 1.2, 0.6], [60, 70, 0.8, 0.8], [80, 55, 1.5, 0.5],
    [120, 75, 1.0, 0.7], [170, 105, 1.4, 0.5], [140, 115, 0.9, 0.7],
    [20, 130, 1.0, 0.5], [180, 135, 1.2, 0.6], [100, 120, 0.8, 0.8]
  ];

  const canopyClusters = [
    [100, 55, 55], [55, 80, 50], [145, 80, 50],
    [35, 115, 40], [165, 115, 40], [100, 30, 50],
    [75, 45, 40], [125, 45, 40], [100, 105, 50]
  ];

  const groveClustersL = [
    [20, 95, 30], [5, 115, 25], [40, 110, 20]
  ];
  const groveClustersR = [
    [180, 95, 30], [195, 115, 25], [160, 110, 20]
  ];

  return (
    <svg viewBox={`0 0 ${w} ${h}`} xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <defs>
        <linearGradient id="s11-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#363266" />
          <stop offset="50%" stopColor="#944b5c" />
          <stop offset="100%" stopColor="#f28f5c" />
        </linearGradient>
        <radialGradient id="s11-sunGlow" cx="50%" cy="85%" r="60%">
          <stop offset="0%" stopColor="#ffd8a8" stopOpacity="0.9" />
          <stop offset="50%" stopColor="#f28f5c" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#944b5c" stopOpacity="0" />
        </radialGradient>

        <linearGradient id="s11-ground" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4a422e" />
          <stop offset="100%" stopColor="#2a2216" />
        </linearGradient>
        <linearGradient id="s11-soilA" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2c1a16" />
          <stop offset="100%" stopColor="#140a08" />
        </linearGradient>

        <linearGradient id="s11-trunk" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#221816" />
          <stop offset="50%" stopColor="#35221c" />
          <stop offset="100%" stopColor="#4a3028" />
        </linearGradient>

        {/* Main Canopy */}
        <radialGradient id="s11-canopyShadow" cx="50%" cy="60%" r="50%">
          <stop offset="0%" stopColor="#2a1622" />
          <stop offset="100%" stopColor="#140a12" />
        </radialGradient>
        <radialGradient id="s11-canopyBase" cx="40%" cy="30%" r="60%">
          <stop offset="0%" stopColor="#662233" />
          <stop offset="100%" stopColor="#33111c" />
        </radialGradient>
        <radialGradient id="s11-canopyHighlight" cx="30%" cy="30%" r="50%">
          <stop offset="0%" stopColor="#a83a48" />
          <stop offset="100%" stopColor="#662233" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="s11-canopyRim" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffb885" />
          <stop offset="100%" stopColor="#a83a48" stopOpacity="0" />
        </linearGradient>

        {/* Background Grove Canopy */}
        <radialGradient id="s11-groveShadow" cx="50%" cy="60%" r="50%">
          <stop offset="0%" stopColor="#1c1622" />
          <stop offset="100%" stopColor="#0c0a12" />
        </radialGradient>
        <radialGradient id="s11-groveBase" cx="40%" cy="30%" r="60%">
          <stop offset="0%" stopColor="#4a2233" />
          <stop offset="100%" stopColor="#22111c" />
        </radialGradient>
      </defs>

      <g id="bg-static">
        <rect width={w} height={h} fill="url(#s11-sky)" />
        <rect width={w} height={h} fill="url(#s11-sunGlow)" />

        {/* Sun rays */}
        <path d={`M ${100*s} ${130*s} L ${-20*s} ${0*s} L ${40*s} ${0*s} Z`} fill="#ffebc2" opacity="0.08" />
        <path d={`M ${100*s} ${130*s} L ${160*s} ${0*s} L ${220*s} ${0*s} Z`} fill="#ffebc2" opacity="0.06" />

        <g id="clouds" opacity="0.9">
          <path d={`M ${20*s} ${50*s} Q ${40*s} ${40*s} ${70*s} ${48*s} T ${130*s} ${42*s} L ${130*s} ${60*s} L ${20*s} ${60*s} Z`} fill="#a65862" opacity="0.8" />
          <path d={`M ${150*s} ${45*s} Q ${170*s} ${35*s} ${190*s} ${42*s} T ${220*s} ${38*s} L ${220*s} ${55*s} L ${150*s} ${55*s} Z`} fill="#a65862" opacity="0.7" />
          <path d={`M ${20*s} ${60*s} L ${130*s} ${60*s}`} stroke="#ffb885" strokeWidth={0.8*s} strokeLinecap="round" opacity="0.9" />
        </g>

        <path d={`M 0 ${125*s} Q ${50*s} ${115*s} ${100*s} ${127*s} T ${185*s} ${121*s} T ${200*s} ${127*s} L ${200*s} ${155*s} L 0 ${155*s} Z`} fill="#6c4a4e" opacity="0.85" />
        <path d={`M 0 ${135*s} Q ${60*s} ${127*s} ${120*s} ${137*s} T ${195*s} ${131*s} T ${200*s} ${135*s} L ${200*s} ${165*s} L 0 ${165*s} Z`} fill="#54383c" opacity="0.9" />

        <path d={`M 0 ${150*s} Q ${65*s} ${144*s} ${130*s} ${152*s} T ${200*s} ${146*s} L ${200*s} ${260*s} L 0 ${260*s} Z`} fill="url(#s11-ground)" />
        <path d={`M 0 ${175*s} Q ${90*s} ${169*s} ${200*s} ${177*s} L ${200*s} ${260*s} L 0 ${260*s} Z`} fill="url(#s11-soilA)" />

        {grassTufts.map(([x, y, h, c], i) => (
          <path key={`gt${i}`} d={`M ${x*s} ${y*s} Q ${(x+c/2)*s} ${(y-h/2)*s} ${(x+c)*s} ${(y-h)*s}`} stroke="#2a2216" strokeWidth={0.8*s} fill="none" strokeLinecap="round" />
        ))}
      </g>

      <g id="grove-bg">
        {/* Left Grove Tree */}
        <path d={`M ${20*s} ${155*s} Q ${15*s} ${130*s} ${20*s} ${100*s}`} stroke="#22111c" strokeWidth={6*s} fill="none" opacity="0.8" />
        {groveClustersL.map(([x,y,r], i) => (
          <g key={`gl${i}`}>
            <circle cx={x*s} cy={y*s} r={r*s} fill="url(#s11-groveShadow)" />
            <circle cx={(x-r*0.1)*s} cy={(y-r*0.1)*s} r={r*0.8*s} fill="url(#s11-groveBase)" />
          </g>
        ))}
        {/* Right Grove Tree */}
        <path d={`M ${180*s} ${155*s} Q ${185*s} ${130*s} ${180*s} ${100*s}`} stroke="#22111c" strokeWidth={6*s} fill="none" opacity="0.8" />
        {groveClustersR.map(([x,y,r], i) => (
          <g key={`gr${i}`}>
            <circle cx={x*s} cy={y*s} r={r*s} fill="url(#s11-groveShadow)" />
            <circle cx={(x-r*0.1)*s} cy={(y-r*0.1)*s} r={r*0.8*s} fill="url(#s11-groveBase)" />
          </g>
        ))}
      </g>

      <g id="trunk" style={{ transformOrigin: `${100*s}px ${175*s}px` }}>
        <path d={`M ${100*s} ${175*s} C ${85*s} ${145*s} ${110*s} ${90*s} ${100*s} ${45*s}`} stroke="url(#s11-trunk)" strokeWidth={24*s} fill="none" strokeLinecap="round" />
        <path d={`M ${92*s} ${175*s} C ${77*s} ${145*s} ${102*s} ${90*s} ${92*s} ${45*s}`} stroke="#4a3028" strokeWidth={3*s} fill="none" strokeLinecap="round" opacity="0.4" />
        <path d={`M ${108*s} ${175*s} C ${93*s} ${145*s} ${118*s} ${90*s} ${108*s} ${45*s}`} stroke="#140a08" strokeWidth={4*s} fill="none" strokeLinecap="round" opacity="0.6" />
      </g>

      <g id="roots" style={{ transformOrigin: `${100*s}px ${175*s}px` }}>
        <path d={`M ${95*s} ${165*s} Q ${65*s} ${175*s} ${60*s} ${185*s}`} stroke="url(#s11-trunk)" strokeWidth={6*s} fill="none" strokeLinecap="round" />
        <path d={`M ${105*s} ${168*s} Q ${135*s} ${175*s} ${145*s} ${190*s}`} stroke="url(#s11-trunk)" strokeWidth={7*s} fill="none" strokeLinecap="round" />
        <path d={`M ${100*s} ${170*s} Q ${95*s} ${185*s} ${110*s} ${200*s}`} stroke="url(#s11-trunk)" strokeWidth={5*s} fill="none" strokeLinecap="round" />
        <path d={`M ${112*s} ${165*s} Q ${150*s} ${165*s} ${165*s} ${180*s}`} stroke="url(#s11-trunk)" strokeWidth={4.5*s} fill="none" strokeLinecap="round" />
        <path d={`M ${88*s} ${168*s} Q ${50*s} ${165*s} ${40*s} ${175*s}`} stroke="url(#s11-trunk)" strokeWidth={4*s} fill="none" strokeLinecap="round" />
      </g>

      <g id="canopy-bg" style={{ transformOrigin: `${100*s}px ${85*s}px` }}>
        {canopyClusters.map(([x,y,r], i) => (
          <g key={i}>
            <circle cx={x*s} cy={y*s} r={r*s} fill="url(#s11-canopyShadow)" />
            <circle cx={(x-r*0.1)*s} cy={(y-r*0.1)*s} r={r*0.85*s} fill="url(#s11-canopyBase)" />
            <circle cx={(x-r*0.2)*s} cy={(y-r*0.25)*s} r={r*0.6*s} fill="url(#s11-canopyHighlight)" />
            <path d={`M ${(x-r*0.6)*s} ${(y-r*0.4)*s} Q ${x*s} ${(y-r*0.9)*s} ${(x+r*0.4)*s} ${(y-r*0.6)*s}`} stroke="url(#s11-canopyRim)" strokeWidth={r*0.15*s} strokeLinecap="round" fill="none" opacity="0.95" />
          </g>
        ))}
      </g>

      <g id="glow">
        {motes.map(([x, y, r, op], i) => (
          <g key={`gm${i}`}>
            <circle cx={x*s} cy={y*s} r={r*3.5*s} fill="#ffd8a8" opacity={(op as number) * 0.4} />
            <circle cx={x*s} cy={y*s} r={r*1.2*s} fill="#ffffff" opacity={op as number} />
          </g>
        ))}
      </g>
    </svg>
  );
}
