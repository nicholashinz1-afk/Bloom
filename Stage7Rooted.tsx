export function Stage7Rooted({ viewBox = "200 260" }: { viewBox?: string }) {
  const [w, h] = viewBox.split(' ').map(Number);
  const s = w / 200;

  const grassTufts = [
    [10, 140, 6, -2], [30, 139, 5, 2], [55, 141, 7, -3],
    [85, 140, 6, 2], [115, 142, 5, -1], [145, 141, 7, 3],
    [165, 140, 6, -2], [185, 139, 5, 1]
  ];

  const motes = [
    [30, 70, 1.2, 0.4], [60, 40, 0.8, 0.6], [80, 25, 1.5, 0.3],
    [120, 45, 1.0, 0.5], [170, 75, 1.4, 0.3], [140, 85, 0.9, 0.5]
  ];

  const canopyClusters = [
    [100, 60, 40], [70, 75, 30], [130, 75, 30],
    [55, 95, 25], [145, 95, 25], [100, 40, 35],
    [80, 50, 25], [120, 50, 25], [100, 85, 30]
  ];

  const renderFlower = (cx: number, cy: number, r: number, key: string, rot: number) => (
    <g id={key} style={{ transformOrigin: `${cx*s}px ${cy*s}px` }}>
      <g transform={`rotate(${rot} ${cx*s} ${cy*s})`}>
        <circle cx={cx*s} cy={cy*s} r={r*20*s} fill="url(#s7-flowerGlow)" />
        {[0, 72, 144, 216, 288].map((a, i) => (
          <g key={i} transform={`rotate(${a} ${cx*s} ${cy*s})`}>
            <path d={`M ${cx*s} ${cy*s} C ${(cx-r*8)*s} ${(cy-r*16)*s} ${(cx-r*4)*s} ${(cy-r*22)*s} ${cx*s} ${(cy-r*22)*s} C ${(cx+r*4)*s} ${(cy-r*22)*s} ${(cx+r*8)*s} ${(cy-r*16)*s} ${cx*s} ${cy*s} Z`} fill="url(#s7-petalOuter)" />
            <path d={`M ${cx*s} ${(cy-r*2)*s} C ${(cx-r*5)*s} ${(cy-r*13)*s} ${(cx-r*2.5)*s} ${(cy-r*20)*s} ${cx*s} ${(cy-r*20)*s} C ${(cx+r*2.5)*s} ${(cy-r*20)*s} ${(cx+r*5)*s} ${(cy-r*13)*s} ${cx*s} ${(cy-r*2)*s} Z`} fill="url(#s7-petalInner)" />
          </g>
        ))}
        <circle cx={cx*s} cy={cy*s} r={r*3.5*s} fill="#d83060" />
        <circle cx={cx*s} cy={cy*s} r={r*1.8*s} fill="#ffd860" />
      </g>
    </g>
  );

  return (
    <svg viewBox={`0 0 ${w} ${h}`} xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <defs>
        <linearGradient id="s7-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4185c7" />
          <stop offset="50%" stopColor="#93c4d1" />
          <stop offset="100%" stopColor="#e0ebd5" />
        </linearGradient>
        <linearGradient id="s7-ground" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#548245" />
          <stop offset="100%" stopColor="#2c5525" />
        </linearGradient>
        <linearGradient id="s7-soilA" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#30241b" />
          <stop offset="100%" stopColor="#1a120c" />
        </linearGradient>
        
        {/* Woody Trunk Gradient */}
        <linearGradient id="s7-trunk" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#4a362a" />
          <stop offset="50%" stopColor="#5c4835" />
          <stop offset="100%" stopColor="#688a45" />
        </linearGradient>

        <radialGradient id="s7-canopyShadow" cx="50%" cy="60%" r="50%">
          <stop offset="0%" stopColor="#1a4218" />
          <stop offset="100%" stopColor="#112e10" />
        </radialGradient>
        <radialGradient id="s7-canopyBase" cx="40%" cy="30%" r="60%">
          <stop offset="0%" stopColor="#4c8a32" />
          <stop offset="100%" stopColor="#2c5a1a" />
        </radialGradient>
        <radialGradient id="s7-canopyHighlight" cx="30%" cy="30%" r="50%">
          <stop offset="0%" stopColor="#8bd258" />
          <stop offset="100%" stopColor="#4c8a32" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="s7-canopyRim" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#c5f298" />
          <stop offset="100%" stopColor="#8bd258" stopOpacity="0" />
        </linearGradient>

        <radialGradient id="s7-petalOuter" cx="50%" cy="80%" r="90%">
          <stop offset="0%" stopColor="#e83870" />
          <stop offset="50%" stopColor="#f86298" />
          <stop offset="100%" stopColor="#ffd1e5" />
        </radialGradient>
        <radialGradient id="s7-petalInner" cx="50%" cy="75%" r="80%">
          <stop offset="0%" stopColor="#c82055" />
          <stop offset="45%" stopColor="#f24a80" />
          <stop offset="100%" stopColor="#fcbcdb" />
        </radialGradient>
        <radialGradient id="s7-flowerGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ff7ba8" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#ff7ba8" stopOpacity="0" />
        </radialGradient>
      </defs>

      <g id="bg-static">
        <rect width={w} height={h} fill="url(#s7-sky)" />

        <g id="clouds" opacity="0.9">
          <path d={`M ${10*s} ${40*s} Q ${25*s} ${30*s} ${55*s} ${38*s} T ${95*s} ${34*s} L ${95*s} ${50*s} L ${10*s} ${50*s} Z`} fill="#ffffff" opacity="0.6" />
          <path d={`M ${140*s} ${30*s} Q ${160*s} ${20*s} ${185*s} ${25*s} T ${200*s} ${22*s} L ${200*s} ${35*s} L ${140*s} ${35*s} Z`} fill="#ffffff" opacity="0.5" />
        </g>

        <path d={`M 0 ${120*s} Q ${45*s} ${110*s} ${95*s} ${122*s} T ${180*s} ${116*s} T ${200*s} ${122*s} L ${200*s} ${150*s} L 0 ${150*s} Z`} fill="#729c88" opacity="0.75" />
        <path d={`M 0 ${130*s} Q ${55*s} ${122*s} ${115*s} ${132*s} T ${195*s} ${126*s} T ${200*s} ${130*s} L ${200*s} ${160*s} L 0 ${160*s} Z`} fill="#5e8870" opacity="0.85" />

        <path d={`M 0 ${142*s} Q ${60*s} ${136*s} ${125*s} ${144*s} T ${200*s} ${138*s} L ${200*s} ${260*s} L 0 ${260*s} Z`} fill="url(#s7-ground)" />
        <path d={`M 0 ${168*s} Q ${85*s} ${162*s} ${200*s} ${170*s} L ${200*s} ${260*s} L 0 ${260*s} Z`} fill="url(#s7-soilA)" />

        {grassTufts.map(([x, y, h, c], i) => (
          <path key={`gt${i}`} d={`M ${x*s} ${y*s} Q ${(x+c/2)*s} ${(y-h/2)*s} ${(x+c)*s} ${(y-h)*s}`} stroke="#2c5525" strokeWidth={0.8*s} fill="none" strokeLinecap="round" />
        ))}
      </g>

      <g id="trunk" style={{ transformOrigin: `${100*s}px ${165*s}px` }}>
        <path d={`M ${100*s} ${165*s} C ${90*s} ${140*s} ${105*s} ${100*s} ${100*s} ${60*s}`} stroke="url(#s7-trunk)" strokeWidth={10*s} fill="none" strokeLinecap="round" />
        <path d={`M ${96*s} ${165*s} C ${86*s} ${140*s} ${101*s} ${100*s} ${96*s} ${60*s}`} stroke="#705642" strokeWidth={1.5*s} fill="none" strokeLinecap="round" opacity="0.4" />
      </g>

      <g id="roots" style={{ transformOrigin: `${100*s}px ${165*s}px` }}>
        <path d={`M ${98*s} ${160*s} Q ${80*s} ${168*s} ${75*s} ${175*s}`} stroke="url(#s7-trunk)" strokeWidth={3*s} fill="none" strokeLinecap="round" />
        <path d={`M ${102*s} ${162*s} Q ${120*s} ${166*s} ${125*s} ${178*s}`} stroke="url(#s7-trunk)" strokeWidth={4*s} fill="none" strokeLinecap="round" />
        <path d={`M ${99*s} ${164*s} Q ${95*s} ${172*s} ${105*s} ${185*s}`} stroke="url(#s7-trunk)" strokeWidth={2.5*s} fill="none" strokeLinecap="round" />
      </g>

      <g id="canopy-bg" style={{ transformOrigin: `${100*s}px ${75*s}px` }}>
        {canopyClusters.map(([x,y,r], i) => (
          <g key={i}>
            <circle cx={x*s} cy={y*s} r={r*s} fill="url(#s7-canopyShadow)" />
            <circle cx={(x-r*0.1)*s} cy={(y-r*0.1)*s} r={r*0.85*s} fill="url(#s7-canopyBase)" />
            <circle cx={(x-r*0.2)*s} cy={(y-r*0.25)*s} r={r*0.6*s} fill="url(#s7-canopyHighlight)" />
            <path d={`M ${(x-r*0.6)*s} ${(y-r*0.4)*s} Q ${x*s} ${(y-r*0.9)*s} ${(x+r*0.4)*s} ${(y-r*0.6)*s}`} stroke="url(#s7-canopyRim)" strokeWidth={r*0.12*s} strokeLinecap="round" fill="none" opacity="0.85" />
          </g>
        ))}
      </g>

      {renderFlower(100, 45, 1.2, "flower-1", 5)}
      {renderFlower(65, 80, 0.9, "flower-2", -15)}
      {renderFlower(135, 75, 1.0, "flower-3", 25)}
      {renderFlower(50, 105, 0.8, "flower-4", -30)}
      {renderFlower(150, 100, 0.85, "flower-5", 35)}
      {renderFlower(85, 95, 0.75, "flower-6", 10)}
      {renderFlower(115, 90, 0.8, "flower-7", -10)}

      <g id="glow">
        {motes.map(([x, y, r, op], i) => (
          <g key={`gm${i}`}>
            <circle cx={x*s} cy={y*s} r={r*3*s} fill="#ffffff" opacity={(op as number) * 0.3} />
            <circle cx={x*s} cy={y*s} r={r*s} fill="#ffffff" opacity={op as number} />
          </g>
        ))}
      </g>
    </svg>
  );
}
