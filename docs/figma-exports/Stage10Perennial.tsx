export function Stage10Perennial({ viewBox = "200 260" }: { viewBox?: string }) {
  const [w, h] = viewBox.split(' ').map(Number);
  const s = w / 200;

  const grassTufts = [
    [5, 148, 6, -2], [25, 147, 5, 2], [50, 149, 7, -3],
    [80, 148, 6, 2], [110, 150, 5, -1], [140, 149, 7, 3],
    [160, 148, 6, -2], [180, 147, 5, 1], [195, 148, 6, 2]
  ];

  const motes = [
    [30, 100, 1.2, 0.4], [60, 70, 0.8, 0.6], [80, 55, 1.5, 0.3],
    [120, 75, 1.0, 0.5], [170, 105, 1.4, 0.3], [140, 115, 0.9, 0.5]
  ];

  const canopyClusters = [
    [100, 55, 55], [55, 80, 50], [145, 80, 50],
    [35, 115, 40], [165, 115, 40], [100, 30, 50],
    [75, 45, 40], [125, 45, 40], [100, 105, 50],
    [65, 120, 35], [135, 120, 35]
  ];

  return (
    <svg viewBox={`0 0 ${w} ${h}`} xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <defs>
        <linearGradient id="s10-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#42588c" />
          <stop offset="50%" stopColor="#a67c76" />
          <stop offset="100%" stopColor="#f2b679" />
        </linearGradient>
        <radialGradient id="s10-sunGlow" cx="60%" cy="80%" r="50%">
          <stop offset="0%" stopColor="#ffebc2" stopOpacity="0.8" />
          <stop offset="50%" stopColor="#f2b679" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#a67c76" stopOpacity="0" />
        </radialGradient>

        <linearGradient id="s10-ground" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#426636" />
          <stop offset="100%" stopColor="#253a1a" />
        </linearGradient>
        <linearGradient id="s10-soilA" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2c221a" />
          <stop offset="100%" stopColor="#140f0a" />
        </linearGradient>

        <linearGradient id="s10-trunk" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#3a2b22" />
          <stop offset="50%" stopColor="#4a362a" />
          <stop offset="100%" stopColor="#554432" />
        </linearGradient>

        <radialGradient id="s10-canopyShadow" cx="50%" cy="60%" r="50%">
          <stop offset="0%" stopColor="#183618" />
          <stop offset="100%" stopColor="#0e240e" />
        </radialGradient>
        <radialGradient id="s10-canopyBase" cx="40%" cy="30%" r="60%">
          <stop offset="0%" stopColor="#356622" />
          <stop offset="100%" stopColor="#1a3d12" />
        </radialGradient>
        <radialGradient id="s10-canopyHighlight" cx="30%" cy="30%" r="50%">
          <stop offset="0%" stopColor="#6ea838" />
          <stop offset="100%" stopColor="#356622" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="s10-canopyRim" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffc085" />
          <stop offset="100%" stopColor="#6ea838" stopOpacity="0" />
        </linearGradient>
      </defs>

      <g id="bg-static">
        <rect width={w} height={h} fill="url(#s10-sky)" />
        <rect width={w} height={h} fill="url(#s10-sunGlow)" />

        <g id="clouds" opacity="0.9">
          <path d={`M ${10*s} ${50*s} Q ${30*s} ${35*s} ${60*s} ${45*s} T ${110*s} ${40*s} L ${110*s} ${60*s} L ${10*s} ${60*s} Z`} fill="#d6a698" opacity="0.8" />
          <path d={`M ${140*s} ${45*s} Q ${160*s} ${35*s} ${180*s} ${40*s} T ${200*s} ${38*s} L ${200*s} ${55*s} L ${140*s} ${55*s} Z`} fill="#d6a698" opacity="0.7" />
          <path d={`M ${10*s} ${60*s} L ${110*s} ${60*s}`} stroke="#ffebc2" strokeWidth={1*s} strokeLinecap="round" opacity="0.8" />
        </g>

        <path d={`M 0 ${125*s} Q ${50*s} ${115*s} ${100*s} ${127*s} T ${185*s} ${121*s} T ${200*s} ${127*s} L ${200*s} ${155*s} L 0 ${155*s} Z`} fill="#827d78" opacity="0.8" />
        <path d={`M 0 ${135*s} Q ${60*s} ${127*s} ${120*s} ${137*s} T ${195*s} ${131*s} T ${200*s} ${135*s} L ${200*s} ${165*s} L 0 ${165*s} Z`} fill="#6b645c" opacity="0.9" />

        <path d={`M 0 ${150*s} Q ${65*s} ${144*s} ${130*s} ${152*s} T ${200*s} ${146*s} L ${200*s} ${260*s} L 0 ${260*s} Z`} fill="url(#s10-ground)" />
        <path d={`M 0 ${175*s} Q ${90*s} ${169*s} ${200*s} ${177*s} L ${200*s} ${260*s} L 0 ${260*s} Z`} fill="url(#s10-soilA)" />

        {grassTufts.map(([x, y, h, c], i) => (
          <path key={`gt${i}`} d={`M ${x*s} ${y*s} Q ${(x+c/2)*s} ${(y-h/2)*s} ${(x+c)*s} ${(y-h)*s}`} stroke="#253a1a" strokeWidth={0.8*s} fill="none" strokeLinecap="round" />
        ))}
      </g>

      <g id="trunk" style={{ transformOrigin: `${100*s}px ${175*s}px` }}>
        <path d={`M ${100*s} ${175*s} C ${85*s} ${145*s} ${110*s} ${90*s} ${100*s} ${45*s}`} stroke="url(#s10-trunk)" strokeWidth={24*s} fill="none" strokeLinecap="round" />
        <path d={`M ${92*s} ${175*s} C ${77*s} ${145*s} ${102*s} ${90*s} ${92*s} ${45*s}`} stroke="#5c4535" strokeWidth={3*s} fill="none" strokeLinecap="round" opacity="0.5" />
        <path d={`M ${108*s} ${175*s} C ${93*s} ${145*s} ${118*s} ${90*s} ${108*s} ${45*s}`} stroke="#221812" strokeWidth={4*s} fill="none" strokeLinecap="round" opacity="0.6" />
        {/* Moss on Trunk */}
        <path d={`M ${94*s} ${172*s} C ${82*s} ${145*s} ${98*s} ${110*s} ${96*s} ${80*s}`} stroke="#4a6828" strokeWidth={4*s} fill="none" strokeLinecap="round" opacity="0.7" />
        <path d={`M ${92*s} ${172*s} C ${80*s} ${145*s} ${96*s} ${110*s} ${94*s} ${80*s}`} stroke="#5c8a38" strokeWidth={2*s} fill="none" strokeLinecap="round" opacity="0.6" />
      </g>

      <g id="roots" style={{ transformOrigin: `${100*s}px ${175*s}px` }}>
        <path d={`M ${95*s} ${165*s} Q ${65*s} ${175*s} ${60*s} ${185*s}`} stroke="url(#s10-trunk)" strokeWidth={6*s} fill="none" strokeLinecap="round" />
        <path d={`M ${105*s} ${168*s} Q ${135*s} ${175*s} ${145*s} ${190*s}`} stroke="url(#s10-trunk)" strokeWidth={7*s} fill="none" strokeLinecap="round" />
        <path d={`M ${100*s} ${170*s} Q ${95*s} ${185*s} ${110*s} ${200*s}`} stroke="url(#s10-trunk)" strokeWidth={5*s} fill="none" strokeLinecap="round" />
        <path d={`M ${112*s} ${165*s} Q ${150*s} ${165*s} ${165*s} ${180*s}`} stroke="url(#s10-trunk)" strokeWidth={4.5*s} fill="none" strokeLinecap="round" />
        <path d={`M ${88*s} ${168*s} Q ${50*s} ${165*s} ${40*s} ${175*s}`} stroke="url(#s10-trunk)" strokeWidth={4*s} fill="none" strokeLinecap="round" />
      </g>

      <g id="canopy-bg" style={{ transformOrigin: `${100*s}px ${85*s}px` }}>
        {canopyClusters.map(([x,y,r], i) => (
          <g key={i}>
            <circle cx={x*s} cy={y*s} r={r*s} fill="url(#s10-canopyShadow)" />
            <circle cx={(x-r*0.1)*s} cy={(y-r*0.1)*s} r={r*0.85*s} fill="url(#s10-canopyBase)" />
            <circle cx={(x-r*0.2)*s} cy={(y-r*0.25)*s} r={r*0.6*s} fill="url(#s10-canopyHighlight)" />
            <path d={`M ${(x-r*0.6)*s} ${(y-r*0.4)*s} Q ${x*s} ${(y-r*0.9)*s} ${(x+r*0.4)*s} ${(y-r*0.6)*s}`} stroke="url(#s10-canopyRim)" strokeWidth={r*0.15*s} strokeLinecap="round" fill="none" opacity="0.9" />
          </g>
        ))}
      </g>

      <g id="glow">
        {motes.map(([x, y, r, op], i) => (
          <g key={`gm${i}`}>
            <circle cx={x*s} cy={y*s} r={r*3*s} fill="#ffebc2" opacity={(op as number) * 0.35} />
            <circle cx={x*s} cy={y*s} r={r*s} fill="#ffffff" opacity={op as number} />
          </g>
        ))}
      </g>
    </svg>
  );
}
