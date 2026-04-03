export function Stage6Flourishing({ viewBox = "200 260" }: { viewBox?: string }) {
  const [w, h] = viewBox.split(' ').map(Number);
  const s = w / 200;

  const grassTufts = [
    [15, 138, 6, -2], [35, 137, 5, 2], [65, 139, 7, -3],
    [95, 138, 6, 2], [130, 140, 5, -1], [160, 139, 7, 3],
    [185, 137, 5, 1]
  ];

  const wildFlowers = [
    [25, 145, 1.2, "#f06090"], [50, 148, 1.0, "#f06090"],
    [150, 150, 1.4, "#f06090"], [175, 142, 1.1, "#f06090"]
  ];

  const butterflies = [
    [40, 60, 0.6], [160, 40, 0.5], [110, 30, 0.4]
  ];

  const renderFlower = (cx: number, cy: number, r: number, key: string, rot: number) => (
    <g id={key} style={{ transformOrigin: `${cx*s}px ${cy*s}px` }}>
      <g transform={`rotate(${rot} ${cx*s} ${cy*s})`}>
        <circle cx={cx*s} cy={cy*s} r={r*24*s} fill="url(#s6-flowerGlow)" />
        {[0, 72, 144, 216, 288].map((a, i) => (
          <g key={i} transform={`rotate(${a} ${cx*s} ${cy*s})`}>
            <path d={`M ${cx*s} ${cy*s} C ${(cx-r*10)*s} ${(cy-r*20)*s} ${(cx-r*5)*s} ${(cy-r*28)*s} ${cx*s} ${(cy-r*28)*s} C ${(cx+r*5)*s} ${(cy-r*28)*s} ${(cx+r*10)*s} ${(cy-r*20)*s} ${cx*s} ${cy*s} Z`} fill="url(#s6-petalOuter)" />
            <path d={`M ${cx*s} ${(cy-r*2)*s} C ${(cx-r*6)*s} ${(cy-r*16)*s} ${(cx-r*3)*s} ${(cy-r*25)*s} ${cx*s} ${(cy-r*25)*s} C ${(cx+r*3)*s} ${(cy-r*25)*s} ${(cx+r*6)*s} ${(cy-r*16)*s} ${cx*s} ${(cy-r*2)*s} Z`} fill="url(#s6-petalInner)" />
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
        <linearGradient id="s6-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#5282a1" />
          <stop offset="50%" stopColor="#9cc2b5" />
          <stop offset="100%" stopColor="#f2ebd9" />
        </linearGradient>
        <radialGradient id="s6-sunGlow" cx="50%" cy="80%" r="60%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.6" />
          <stop offset="50%" stopColor="#f2ebd9" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#9cc2b5" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="s6-ground" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4c6a3c" />
          <stop offset="100%" stopColor="#2c4224" />
        </linearGradient>
        <linearGradient id="s6-soilA" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#261c16" />
          <stop offset="100%" stopColor="#140f0c" />
        </linearGradient>
        <linearGradient id="s6-stem" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#355828" />
          <stop offset="50%" stopColor="#5c9a48" />
          <stop offset="100%" stopColor="#85d268" />
        </linearGradient>
        <radialGradient id="s6-leaf" cx="30%" cy="20%" r="90%">
          <stop offset="0%" stopColor="#b5f285" />
          <stop offset="60%" stopColor="#6cb844" />
          <stop offset="100%" stopColor="#357222" />
        </radialGradient>
        <radialGradient id="s6-petalOuter" cx="50%" cy="80%" r="90%">
          <stop offset="0%" stopColor="#e83870" />
          <stop offset="50%" stopColor="#fa7ba8" />
          <stop offset="100%" stopColor="#ffe4f0" />
        </radialGradient>
        <radialGradient id="s6-petalInner" cx="50%" cy="75%" r="80%">
          <stop offset="0%" stopColor="#c82055" />
          <stop offset="45%" stopColor="#f25588" />
          <stop offset="100%" stopColor="#fcd2e5" />
        </radialGradient>
        <radialGradient id="s6-flowerGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ff7ba8" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#ff7ba8" stopOpacity="0" />
        </radialGradient>
      </defs>

      <g id="bg-static">
        <rect width={w} height={h} fill="url(#s6-sky)" />
        <rect width={w} height={h} fill="url(#s6-sunGlow)" />

        {/* Clouds */}
        <g id="clouds" opacity="0.85">
          <path d={`M ${15*s} ${45*s} Q ${30*s} ${35*s} ${50*s} ${40*s} T ${85*s} ${37*s} L ${85*s} ${50*s} L ${15*s} ${50*s} Z`} fill="#dce6e2" opacity="0.7" />
          <path d={`M ${130*s} ${35*s} Q ${150*s} ${25*s} ${170*s} ${30*s} T ${200*s} ${27*s} L ${200*s} ${40*s} L ${130*s} ${40*s} Z`} fill="#dce6e2" opacity="0.6" />
        </g>

        {/* Hills */}
        <path d={`M 0 ${115*s} Q ${50*s} ${105*s} ${90*s} ${117*s} T ${170*s} ${113*s} T ${200*s} ${120*s} L ${200*s} ${145*s} L 0 ${145*s} Z`} fill="#668a7a" opacity="0.8" />
        <path d={`M 0 ${125*s} Q ${60*s} ${119*s} ${110*s} ${127*s} T ${190*s} ${123*s} T ${200*s} ${127*s} L ${200*s} ${155*s} L 0 ${155*s} Z`} fill="#547866" opacity="0.9" />

        {/* Ground */}
        <path d={`M 0 ${140*s} Q ${70*s} ${135*s} ${130*s} ${141*s} T ${200*s} ${137*s} L ${200*s} ${260*s} L 0 ${260*s} Z`} fill="url(#s6-ground)" />
        <path d={`M 0 ${165*s} Q ${90*s} ${159*s} ${200*s} ${168*s} L ${200*s} ${260*s} L 0 ${260*s} Z`} fill="url(#s6-soilA)" />

        {/* Details */}
        {grassTufts.map(([x, y, h, c], i) => (
          <path key={`gt${i}`} d={`M ${x*s} ${y*s} Q ${(x+c/2)*s} ${(y-h/2)*s} ${(x+c)*s} ${(y-h)*s}`} stroke="#2c4a22" strokeWidth={0.8*s} fill="none" strokeLinecap="round" />
        ))}
        {wildFlowers.map(([x, y, r, c], i) => (
          <g key={`wf${i}`}>
            <circle cx={x*s} cy={y*s} r={r*2.5*s} fill={c as string} opacity="0.25" />
            <circle cx={x*s} cy={y*s} r={r*s} fill={c as string} opacity="0.9" />
          </g>
        ))}
      </g>

      {/* Main Stem & Branches */}
      <g id="stem-1" style={{ transformOrigin: `${100*s}px ${160*s}px` }}>
        <path d={`M ${100*s} ${165*s} C ${92*s} ${130*s} ${108*s} ${80*s} ${100*s} ${30*s}`} stroke="url(#s6-stem)" strokeWidth={6*s} fill="none" strokeLinecap="round" />
        <path d={`M ${98*s} ${165*s} C ${90*s} ${130*s} ${106*s} ${80*s} ${98*s} ${30*s}`} stroke="#b5f285" strokeWidth={1.2*s} fill="none" strokeLinecap="round" opacity="0.4" />
      </g>
      
      <g id="branch-1" style={{ transformOrigin: `${98*s}px ${120*s}px` }}>
        <path d={`M ${98*s} ${120*s} Q ${60*s} ${105*s} ${45*s} ${85*s}`} stroke="url(#s6-stem)" strokeWidth={3*s} fill="none" strokeLinecap="round" />
      </g>
      <g id="branch-2" style={{ transformOrigin: `${103*s}px ${100*s}px` }}>
        <path d={`M ${103*s} ${100*s} Q ${140*s} ${90*s} ${155*s} ${65*s}`} stroke="url(#s6-stem)" strokeWidth={3*s} fill="none" strokeLinecap="round" />
      </g>
      <g id="branch-3" style={{ transformOrigin: `${99*s}px ${75*s}px` }}>
        <path d={`M ${99*s} ${75*s} Q ${70*s} ${65*s} ${55*s} ${45*s}`} stroke="url(#s6-stem)" strokeWidth={2.5*s} fill="none" strokeLinecap="round" />
      </g>
      <g id="branch-4" style={{ transformOrigin: `${102*s}px ${60*s}px` }}>
        <path d={`M ${102*s} ${60*s} Q ${125*s} ${50*s} ${135*s} ${35*s}`} stroke="url(#s6-stem)" strokeWidth={2.5*s} fill="none" strokeLinecap="round" />
      </g>

      {/* Leaves mapped compactly */}
      <g id="leaves">
        {[
          [100, 140, 80, 110, -1], [100, 140, 120, 110, 1],
          [60, 95, 40, 65, -1], [60, 95, 80, 65, 1],
          [140, 80, 120, 50, -1], [140, 80, 160, 50, 1],
          [75, 55, 55, 25, -1], [75, 55, 95, 25, 1],
          [125, 45, 105, 15, -1], [125, 45, 145, 15, 1]
        ].map(([cx, cy, tx, ty, dir], i) => (
          <path key={`l${i}`} d={`M ${cx*s} ${cy*s} C ${(cx+(tx-cx)*0.2 + dir*15)*s} ${(cy+(ty-cy)*0.2)*s} ${(cx+(tx-cx)*0.8 + dir*10)*s} ${(cy+(ty-cy)*0.8)*s} ${tx*s} ${ty*s} C ${(cx+(tx-cx)*0.8 - dir*5)*s} ${(cy+(ty-cy)*0.8 - dir*10)*s} ${(cx+(tx-cx)*0.2 - dir*10)*s} ${(cy+(ty-cy)*0.2 - dir*10)*s} ${cx*s} ${cy*s} Z`} fill="url(#s6-leaf)" />
        ))}
      </g>

      {/* Flowers (5) */}
      {renderFlower(100, 30, 1.1, "flower-1", 0)}
      {renderFlower(45, 85, 0.9, "flower-2", -15)}
      {renderFlower(155, 65, 0.95, "flower-3", 25)}
      {renderFlower(55, 45, 0.8, "flower-4", -30)}
      {renderFlower(135, 35, 0.85, "flower-5", 40)}

      {/* Butterflies */}
      <g id="glow">
        {butterflies.map(([x, y, sc], i) => (
          <g key={`b${i}`} transform={`translate(${x*s}, ${y*s}) scale(${sc as number})`}>
            <path d={`M 0 0 Q ${-5*s} ${-8*s} ${-10*s} ${-2*s} Q ${-5*s} ${2*s} 0 0 Z`} fill="#fff" opacity="0.8" />
            <path d={`M 0 0 Q ${5*s} ${-8*s} ${10*s} ${-2*s} Q ${5*s} ${2*s} 0 0 Z`} fill="#fff" opacity="0.8" />
            <circle cx={0} cy={0} r={2*s} fill="#fff" />
          </g>
        ))}
      </g>
    </svg>
  );
}
