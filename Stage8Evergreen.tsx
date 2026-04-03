export function Stage8Evergreen({ viewBox = "200 260" }: { viewBox?: string }) {
  const [w, h] = viewBox.split(' ').map(Number);
  const s = w / 200;

  const grassTufts = [
    [10, 145, 6, -2], [30, 144, 5, 2], [55, 146, 7, -3],
    [85, 145, 6, 2], [115, 147, 5, -1], [145, 146, 7, 3],
    [165, 145, 6, -2], [185, 144, 5, 1]
  ];

  const motes = [
    [30, 90, 1.2, 0.4], [60, 60, 0.8, 0.6], [80, 45, 1.5, 0.3],
    [120, 65, 1.0, 0.5], [170, 95, 1.4, 0.3], [140, 105, 0.9, 0.5]
  ];

  const canopyClusters = [
    [100, 60, 50], [60, 80, 45], [140, 80, 45],
    [40, 110, 35], [160, 110, 35], [100, 40, 45],
    [80, 50, 35], [120, 50, 35], [100, 100, 45],
    [70, 115, 30], [130, 115, 30]
  ];

  return (
    <svg viewBox={`0 0 ${w} ${h}`} xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <defs>
        <linearGradient id="s8-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#387cbd" />
          <stop offset="50%" stopColor="#81b9c9" />
          <stop offset="100%" stopColor="#d6e3c5" />
        </linearGradient>
        <radialGradient id="s8-sunGlow" cx="60%" cy="30%" r="50%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.8" />
          <stop offset="50%" stopColor="#f0fae6" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#f0fae6" stopOpacity="0" />
        </radialGradient>

        <linearGradient id="s8-ground" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#457038" />
          <stop offset="100%" stopColor="#25451a" />
        </linearGradient>
        <linearGradient id="s8-soilA" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#281e15" />
          <stop offset="100%" stopColor="#140f0a" />
        </linearGradient>

        <linearGradient id="s8-trunk" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#453225" />
          <stop offset="50%" stopColor="#554232" />
          <stop offset="100%" stopColor="#4c6a32" />
        </linearGradient>

        <radialGradient id="s8-canopyShadow" cx="50%" cy="60%" r="50%">
          <stop offset="0%" stopColor="#123512" />
          <stop offset="100%" stopColor="#0b220b" />
        </radialGradient>
        <radialGradient id="s8-canopyBase" cx="40%" cy="30%" r="60%">
          <stop offset="0%" stopColor="#3a7525" />
          <stop offset="100%" stopColor="#1c4810" />
        </radialGradient>
        <radialGradient id="s8-canopyHighlight" cx="30%" cy="30%" r="50%">
          <stop offset="0%" stopColor="#7ac245" />
          <stop offset="100%" stopColor="#3a7525" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="s8-canopyRim" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#b4ed82" />
          <stop offset="100%" stopColor="#7ac245" stopOpacity="0" />
        </linearGradient>
      </defs>

      <g id="bg-static">
        <rect width={w} height={h} fill="url(#s8-sky)" />
        <rect width={w} height={h} fill="url(#s8-sunGlow)" />

        <g id="clouds" opacity="0.95">
          <path d={`M ${15*s} ${35*s} Q ${35*s} ${20*s} ${60*s} ${28*s} T ${100*s} ${25*s} L ${100*s} ${45*s} L ${15*s} ${45*s} Z`} fill="#ffffff" opacity="0.8" />
          <path d={`M ${150*s} ${20*s} Q ${175*s} ${10*s} ${200*s} ${18*s} L ${200*s} ${30*s} L ${150*s} ${30*s} Z`} fill="#ffffff" opacity="0.7" />
        </g>

        <path d={`M 0 ${125*s} Q ${50*s} ${115*s} ${100*s} ${127*s} T ${185*s} ${121*s} T ${200*s} ${127*s} L ${200*s} ${155*s} L 0 ${155*s} Z`} fill="#7aa892" opacity="0.8" />
        <path d={`M 0 ${135*s} Q ${60*s} ${127*s} ${120*s} ${137*s} T ${195*s} ${131*s} T ${200*s} ${135*s} L ${200*s} ${165*s} L 0 ${165*s} Z`} fill="#64947c" opacity="0.9" />

        <path d={`M 0 ${147*s} Q ${65*s} ${141*s} ${130*s} ${149*s} T ${200*s} ${143*s} L ${200*s} ${260*s} L 0 ${260*s} Z`} fill="url(#s8-ground)" />
        <path d={`M 0 ${173*s} Q ${90*s} ${167*s} ${200*s} ${175*s} L ${200*s} ${260*s} L 0 ${260*s} Z`} fill="url(#s8-soilA)" />

        {grassTufts.map(([x, y, h, c], i) => (
          <path key={`gt${i}`} d={`M ${x*s} ${y*s} Q ${(x+c/2)*s} ${(y-h/2)*s} ${(x+c)*s} ${(y-h)*s}`} stroke="#25451a" strokeWidth={0.8*s} fill="none" strokeLinecap="round" />
        ))}
      </g>

      <g id="trunk" style={{ transformOrigin: `${100*s}px ${170*s}px` }}>
        <path d={`M ${100*s} ${170*s} C ${88*s} ${140*s} ${108*s} ${90*s} ${100*s} ${50*s}`} stroke="url(#s8-trunk)" strokeWidth={15*s} fill="none" strokeLinecap="round" />
        <path d={`M ${94*s} ${170*s} C ${82*s} ${140*s} ${102*s} ${90*s} ${94*s} ${50*s}`} stroke="#685040" strokeWidth={2*s} fill="none" strokeLinecap="round" opacity="0.5" />
        <path d={`M ${106*s} ${170*s} C ${94*s} ${140*s} ${114*s} ${90*s} ${106*s} ${50*s}`} stroke="#322218" strokeWidth={2.5*s} fill="none" strokeLinecap="round" opacity="0.6" />
      </g>

      <g id="roots" style={{ transformOrigin: `${100*s}px ${170*s}px` }}>
        <path d={`M ${97*s} ${162*s} Q ${75*s} ${172*s} ${70*s} ${180*s}`} stroke="url(#s8-trunk)" strokeWidth={4.5*s} fill="none" strokeLinecap="round" />
        <path d={`M ${103*s} ${165*s} Q ${125*s} ${170*s} ${135*s} ${185*s}`} stroke="url(#s8-trunk)" strokeWidth={5.5*s} fill="none" strokeLinecap="round" />
        <path d={`M ${100*s} ${168*s} Q ${95*s} ${180*s} ${105*s} ${195*s}`} stroke="url(#s8-trunk)" strokeWidth={3.5*s} fill="none" strokeLinecap="round" />
        <path d={`M ${108*s} ${162*s} Q ${140*s} ${165*s} ${150*s} ${175*s}`} stroke="url(#s8-trunk)" strokeWidth={3*s} fill="none" strokeLinecap="round" />
      </g>

      <g id="canopy-bg" style={{ transformOrigin: `${100*s}px ${85*s}px` }}>
        {canopyClusters.map(([x,y,r], i) => (
          <g key={i}>
            <circle cx={x*s} cy={y*s} r={r*s} fill="url(#s8-canopyShadow)" />
            <circle cx={(x-r*0.1)*s} cy={(y-r*0.1)*s} r={r*0.85*s} fill="url(#s8-canopyBase)" />
            <circle cx={(x-r*0.2)*s} cy={(y-r*0.25)*s} r={r*0.6*s} fill="url(#s8-canopyHighlight)" />
            <path d={`M ${(x-r*0.6)*s} ${(y-r*0.4)*s} Q ${x*s} ${(y-r*0.9)*s} ${(x+r*0.4)*s} ${(y-r*0.6)*s}`} stroke="url(#s8-canopyRim)" strokeWidth={r*0.15*s} strokeLinecap="round" fill="none" opacity="0.9" />
          </g>
        ))}
      </g>

      <g id="glow">
        {motes.map(([x, y, r, op], i) => (
          <g key={`gm${i}`}>
            <circle cx={x*s} cy={y*s} r={r*3*s} fill="#ffffff" opacity={(op as number) * 0.35} />
            <circle cx={x*s} cy={y*s} r={r*s} fill="#ffffff" opacity={op as number} />
          </g>
        ))}
      </g>
    </svg>
  );
}
