export function Stage5Flowering({ viewBox = "200 260" }: { viewBox?: string }) {
  const [w, h] = viewBox.split(' ').map(Number);
  const s = w / 200;

  const grassTufts = [
    [10, 138, 6, -2], [25, 137, 5, 2], [45, 139, 7, -3],
    [75, 138, 6, 2], [110, 140, 5, -1], [140, 139, 7, 3],
    [170, 138, 6, -2], [190, 137, 5, 1]
  ];

  const wildFlowers = [
    [35, 145, 1.2, "#f06090"], [160, 148, 1.0, "#f06090"],
    [85, 150, 1.4, "#f06090"], [120, 142, 1.1, "#f06090"]
  ];

  const motes = [
    [40, 80, 1.2, 0.4], [70, 45, 0.8, 0.6], [90, 30, 1.5, 0.3],
    [130, 50, 1.0, 0.5], [160, 80, 1.4, 0.3], [110, 90, 0.9, 0.5]
  ];

  const renderFlower = (cx: number, cy: number, r: number, key: string, rot: number) => (
    <g id={key} style={{ transformOrigin: `${cx*s}px ${cy*s}px` }}>
      <g transform={`rotate(${rot} ${cx*s} ${cy*s})`}>
        <circle cx={cx*s} cy={cy*s} r={r*24*s} fill="url(#s5-flowerGlow)" />
        {[0, 72, 144, 216, 288].map((a, i) => (
          <g key={i} transform={`rotate(${a} ${cx*s} ${cy*s})`}>
            <path d={`M ${cx*s} ${cy*s} C ${(cx-r*10)*s} ${(cy-r*20)*s} ${(cx-r*5)*s} ${(cy-r*28)*s} ${cx*s} ${(cy-r*28)*s} C ${(cx+r*5)*s} ${(cy-r*28)*s} ${(cx+r*10)*s} ${(cy-r*20)*s} ${cx*s} ${cy*s} Z`} fill="url(#s5-petalOuter)" />
            <path d={`M ${cx*s} ${(cy-r*2)*s} C ${(cx-r*6)*s} ${(cy-r*16)*s} ${(cx-r*3)*s} ${(cy-r*25)*s} ${cx*s} ${(cy-r*25)*s} C ${(cx+r*3)*s} ${(cy-r*25)*s} ${(cx+r*6)*s} ${(cy-r*16)*s} ${cx*s} ${(cy-r*2)*s} Z`} fill="url(#s5-petalInner)" />
            <path d={`M ${cx*s} ${cy*s} L ${cx*s} ${(cy-r*18)*s}`} stroke="#c82060" strokeWidth={0.6*s} opacity="0.4" />
          </g>
        ))}
        <circle cx={cx*s} cy={cy*s} r={r*4*s} fill="#d83060" />
        <circle cx={cx*s} cy={cy*s} r={r*2*s} fill="#ffd860" />
      </g>
    </g>
  );

  return (
    <svg viewBox={`0 0 ${w} ${h}`} xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <defs>
        <linearGradient id="s5-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#47688c" />
          <stop offset="40%" stopColor="#7b9ba6" />
          <stop offset="100%" stopColor="#e6dfb3" />
        </linearGradient>
        <radialGradient id="s5-sunGlow" cx="50%" cy="80%" r="60%">
          <stop offset="0%" stopColor="#fff2c8" stopOpacity="0.8" />
          <stop offset="40%" stopColor="#f0d3a8" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#e6dfb3" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="s5-ground" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3c5a32" />
          <stop offset="100%" stopColor="#1e321c" />
        </linearGradient>
        <linearGradient id="s5-soilA" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2c221a" />
          <stop offset="100%" stopColor="#18120e" />
        </linearGradient>
        <linearGradient id="s5-stem" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#355828" />
          <stop offset="50%" stopColor="#558c42" />
          <stop offset="100%" stopColor="#75b85a" />
        </linearGradient>
        <radialGradient id="s5-leaf" cx="30%" cy="20%" r="90%">
          <stop offset="0%" stopColor="#a8e578" />
          <stop offset="60%" stopColor="#62a83e" />
          <stop offset="100%" stopColor="#2d621c" />
        </radialGradient>
        <radialGradient id="s5-petalOuter" cx="50%" cy="80%" r="90%">
          <stop offset="0%" stopColor="#e84078" />
          <stop offset="50%" stopColor="#f880b0" />
          <stop offset="100%" stopColor="#fcd8e8" />
        </radialGradient>
        <radialGradient id="s5-petalInner" cx="50%" cy="75%" r="80%">
          <stop offset="0%" stopColor="#d02860" />
          <stop offset="45%" stopColor="#f06090" />
          <stop offset="100%" stopColor="#fac8e0" />
        </radialGradient>
        <radialGradient id="s5-flowerGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ff70a0" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#ff70a0" stopOpacity="0" />
        </radialGradient>
      </defs>

      <g id="bg-static">
        <rect width={w} height={h} fill="url(#s5-sky)" />
        <rect width={w} height={h} fill="url(#s5-sunGlow)" />

        {/* Clouds */}
        <g id="clouds" opacity="0.8">
          <path d={`M ${30*s} ${50*s} Q ${45*s} ${40*s} ${65*s} ${45*s} T ${100*s} ${42*s} L ${100*s} ${55*s} L ${30*s} ${55*s} Z`} fill="#c5cfd4" opacity="0.6" />
          <path d={`M ${120*s} ${60*s} Q ${140*s} ${50*s} ${160*s} ${55*s} T ${190*s} ${52*s} L ${190*s} ${65*s} L ${120*s} ${65*s} Z`} fill="#c5cfd4" opacity="0.5" />
          <line x1={30*s} y1={55*s} x2={100*s} y2={55*s} stroke="#fff2c8" strokeWidth={0.8*s} strokeLinecap="round" opacity="0.9" />
          <line x1={120*s} y1={65*s} x2={190*s} y2={65*s} stroke="#fff2c8" strokeWidth={0.8*s} strokeLinecap="round" opacity="0.8" />
        </g>

        {/* Hills */}
        <path d={`M 0 ${110*s} Q ${40*s} ${100*s} ${80*s} ${112*s} T ${160*s} ${108*s} T ${200*s} ${115*s} L ${200*s} ${140*s} L 0 ${140*s} Z`} fill="#5a7a6c" opacity="0.8" />
        <path d={`M 0 ${120*s} Q ${50*s} ${114*s} ${100*s} ${122*s} T ${180*s} ${118*s} T ${200*s} ${122*s} L ${200*s} ${150*s} L 0 ${150*s} Z`} fill="#48685a" opacity="0.9" />

        {/* Ground */}
        <path d={`M 0 ${135*s} Q ${60*s} ${130*s} ${120*s} ${136*s} T ${200*s} ${132*s} L ${200*s} ${260*s} L 0 ${260*s} Z`} fill="url(#s5-ground)" />
        <path d={`M 0 ${162*s} Q ${80*s} ${156*s} ${200*s} ${165*s} L ${200*s} ${260*s} L 0 ${260*s} Z`} fill="url(#s5-soilA)" />

        {/* Details */}
        {grassTufts.map(([x, y, h, c], i) => (
          <path key={`gt${i}`} d={`M ${x*s} ${y*s} Q ${(x+c/2)*s} ${(y-h/2)*s} ${(x+c)*s} ${(y-h)*s}`} stroke="#223a1a" strokeWidth={0.8*s} fill="none" strokeLinecap="round" />
        ))}
        {wildFlowers.map(([x, y, r, c], i) => (
          <g key={`wf${i}`}>
            <circle cx={x*s} cy={y*s} r={r*2.5*s} fill={c as string} opacity="0.2" />
            <circle cx={x*s} cy={y*s} r={r*s} fill={c as string} opacity="0.9" />
            <circle cx={(x+r*0.3)*s} cy={(y-r*0.3)*s} r={r*0.5*s} fill="#ffc0d8" opacity="0.9" />
          </g>
        ))}
      </g>

      {/* Main Stem & Branches */}
      <g id="stem-1" style={{ transformOrigin: `${100*s}px ${160*s}px` }}>
        <path d={`M ${100*s} ${165*s} C ${95*s} ${130*s} ${105*s} ${90*s} ${100*s} ${40*s}`} stroke="url(#s5-stem)" strokeWidth={4.5*s} fill="none" strokeLinecap="round" />
        <path d={`M ${98.5*s} ${165*s} C ${93.5*s} ${130*s} ${103.5*s} ${90*s} ${98.5*s} ${40*s}`} stroke="#a8e578" strokeWidth={0.8*s} fill="none" strokeLinecap="round" opacity="0.4" />
      </g>
      <g id="branch-1" style={{ transformOrigin: `${98*s}px ${110*s}px` }}>
        <path d={`M ${98*s} ${110*s} Q ${70*s} ${100*s} ${55*s} ${80*s}`} stroke="url(#s5-stem)" strokeWidth={2.5*s} fill="none" strokeLinecap="round" />
      </g>
      <g id="branch-2" style={{ transformOrigin: `${102*s}px ${85*s}px` }}>
        <path d={`M ${102*s} ${85*s} Q ${130*s} ${75*s} ${145*s} ${55*s}`} stroke="url(#s5-stem)" strokeWidth={2.5*s} fill="none" strokeLinecap="round" />
      </g>

      {/* Leaves */}
      <g id="leaves-1" style={{ transformOrigin: `${100*s}px ${140*s}px` }}>
        <path d={`M ${98*s} ${140*s} C ${80*s} ${145*s} ${60*s} ${130*s} ${50*s} ${110*s} C ${60*s} ${115*s} ${80*s} ${120*s} ${98*s} ${140*s} Z`} fill="url(#s5-leaf)" />
        <path d={`M ${102*s} ${135*s} C ${120*s} ${140*s} ${140*s} ${125*s} ${150*s} ${105*s} C ${140*s} ${110*s} ${120*s} ${115*s} ${102*s} ${135*s} Z`} fill="url(#s5-leaf)" />
      </g>
      <g id="leaves-2" style={{ transformOrigin: `${60*s}px ${90*s}px` }}>
        <path d={`M ${60*s} ${90*s} C ${45*s} ${92*s} ${30*s} ${80*s} ${25*s} ${65*s} C ${35*s} ${70*s} ${50*s} ${75*s} ${60*s} ${90*s} Z`} fill="url(#s5-leaf)" />
        <path d={`M ${65*s} ${85*s} C ${75*s} ${88*s} ${90*s} ${75*s} ${95*s} ${60*s} C ${85*s} ${65*s} ${75*s} ${70*s} ${65*s} ${85*s} Z`} fill="url(#s5-leaf)" />
      </g>
      <g id="leaves-3" style={{ transformOrigin: `${135*s}px ${65*s}px` }}>
        <path d={`M ${135*s} ${65*s} C ${120*s} ${68*s} ${105*s} ${55*s} ${100*s} ${40*s} C ${110*s} ${45*s} ${125*s} ${50*s} ${135*s} ${65*s} Z`} fill="url(#s5-leaf)" />
        <path d={`M ${140*s} ${60*s} C ${155*s} ${62*s} ${170*s} ${50*s} ${175*s} ${35*s} C ${165*s} ${40*s} ${150*s} ${45*s} ${140*s} ${60*s} Z`} fill="url(#s5-leaf)" />
      </g>

      {/* Flowers */}
      {renderFlower(100, 40, 1.0, "flower-1", 15)}
      {renderFlower(55, 80, 0.8, "flower-2", -20)}
      {renderFlower(145, 55, 0.85, "flower-3", 35)}

      {/* Atmospheric Dawn Motes */}
      <g id="glow">
        {motes.map(([x, y, r, op], i) => (
          <g key={`gm${i}`}>
            <circle cx={x*s} cy={y*s} r={r*3*s} fill="#fff2c8" opacity={(op as number) * 0.3} />
            <circle cx={x*s} cy={y*s} r={r*s} fill="#ffffff" opacity={op as number} />
          </g>
        ))}
      </g>
    </svg>
  );
}
