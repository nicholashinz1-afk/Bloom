export function Stage9FullBloom({ viewBox = "200 260" }: { viewBox?: string }) {
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

  const fallingPetals = [
    [45, 120, 15], [85, 130, 45], [115, 140, -20],
    [155, 125, 30], [65, 150, -45], [175, 145, 60],
    [135, 160, 10], [95, 155, -30], [25, 100, 45]
  ];

  return (
    <svg viewBox={`0 0 ${w} ${h}`} xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <defs>
        <linearGradient id="s9-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#306ba8" />
          <stop offset="50%" stopColor="#6ba6bd" />
          <stop offset="100%" stopColor="#f0d3a8" />
        </linearGradient>
        <radialGradient id="s9-sunGlow" cx="40%" cy="40%" r="50%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.7" />
          <stop offset="50%" stopColor="#ffebb5" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#ffebb5" stopOpacity="0" />
        </radialGradient>

        <linearGradient id="s9-ground" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4c7538" />
          <stop offset="100%" stopColor="#2a4a1c" />
        </linearGradient>
        <linearGradient id="s9-soilA" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2e2216" />
          <stop offset="100%" stopColor="#160f09" />
        </linearGradient>

        <linearGradient id="s9-trunk" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#453225" />
          <stop offset="50%" stopColor="#554232" />
          <stop offset="100%" stopColor="#6c5040" />
        </linearGradient>

        {/* Pink Bloom Canopy Gradients */}
        <radialGradient id="s9-canopyShadow" cx="50%" cy="60%" r="50%">
          <stop offset="0%" stopColor="#a8204b" />
          <stop offset="100%" stopColor="#660e28" />
        </radialGradient>
        <radialGradient id="s9-canopyBase" cx="40%" cy="30%" r="60%">
          <stop offset="0%" stopColor="#e84078" />
          <stop offset="100%" stopColor="#b0204d" />
        </radialGradient>
        <radialGradient id="s9-canopyHighlight" cx="30%" cy="30%" r="50%">
          <stop offset="0%" stopColor="#ff85b3" />
          <stop offset="100%" stopColor="#e84078" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="s9-canopyRim" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffcce0" />
          <stop offset="100%" stopColor="#ff85b3" stopOpacity="0" />
        </linearGradient>
      </defs>

      <g id="bg-static">
        <rect width={w} height={h} fill="url(#s9-sky)" />
        <rect width={w} height={h} fill="url(#s9-sunGlow)" />

        <g id="clouds" opacity="0.8">
          <path d={`M ${10*s} ${40*s} Q ${30*s} ${25*s} ${55*s} ${35*s} T ${90*s} ${30*s} L ${90*s} ${50*s} L ${10*s} ${50*s} Z`} fill="#ffffff" opacity="0.9" />
          <path d={`M ${160*s} ${30*s} Q ${180*s} ${20*s} ${200*s} ${28*s} L ${200*s} ${45*s} L ${160*s} ${45*s} Z`} fill="#ffffff" opacity="0.8" />
        </g>

        <path d={`M 0 ${125*s} Q ${50*s} ${115*s} ${100*s} ${127*s} T ${185*s} ${121*s} T ${200*s} ${127*s} L ${200*s} ${155*s} L 0 ${155*s} Z`} fill="#82a688" opacity="0.85" />
        <path d={`M 0 ${135*s} Q ${60*s} ${127*s} ${120*s} ${137*s} T ${195*s} ${131*s} T ${200*s} ${135*s} L ${200*s} ${165*s} L 0 ${165*s} Z`} fill="#6b9278" opacity="0.9" />

        <path d={`M 0 ${147*s} Q ${65*s} ${141*s} ${130*s} ${149*s} T ${200*s} ${143*s} L ${200*s} ${260*s} L 0 ${260*s} Z`} fill="url(#s9-ground)" />
        <path d={`M 0 ${173*s} Q ${90*s} ${167*s} ${200*s} ${175*s} L ${200*s} ${260*s} L 0 ${260*s} Z`} fill="url(#s9-soilA)" />

        {grassTufts.map(([x, y, h, c], i) => (
          <path key={`gt${i}`} d={`M ${x*s} ${y*s} Q ${(x+c/2)*s} ${(y-h/2)*s} ${(x+c)*s} ${(y-h)*s}`} stroke="#2a4a1c" strokeWidth={0.8*s} fill="none" strokeLinecap="round" />
        ))}
      </g>

      <g id="trunk" style={{ transformOrigin: `${100*s}px ${170*s}px` }}>
        <path d={`M ${100*s} ${170*s} C ${88*s} ${140*s} ${108*s} ${90*s} ${100*s} ${50*s}`} stroke="url(#s9-trunk)" strokeWidth={15*s} fill="none" strokeLinecap="round" />
        <path d={`M ${94*s} ${170*s} C ${82*s} ${140*s} ${102*s} ${90*s} ${94*s} ${50*s}`} stroke="#725545" strokeWidth={2*s} fill="none" strokeLinecap="round" opacity="0.5" />
        <path d={`M ${106*s} ${170*s} C ${94*s} ${140*s} ${114*s} ${90*s} ${106*s} ${50*s}`} stroke="#2c1a10" strokeWidth={2.5*s} fill="none" strokeLinecap="round" opacity="0.6" />
      </g>

      <g id="roots" style={{ transformOrigin: `${100*s}px ${170*s}px` }}>
        <path d={`M ${97*s} ${162*s} Q ${75*s} ${172*s} ${70*s} ${180*s}`} stroke="url(#s9-trunk)" strokeWidth={4.5*s} fill="none" strokeLinecap="round" />
        <path d={`M ${103*s} ${165*s} Q ${125*s} ${170*s} ${135*s} ${185*s}`} stroke="url(#s9-trunk)" strokeWidth={5.5*s} fill="none" strokeLinecap="round" />
        <path d={`M ${100*s} ${168*s} Q ${95*s} ${180*s} ${105*s} ${195*s}`} stroke="url(#s9-trunk)" strokeWidth={3.5*s} fill="none" strokeLinecap="round" />
      </g>

      <g id="canopy-bg" style={{ transformOrigin: `${100*s}px ${85*s}px` }}>
        {canopyClusters.map(([x,y,r], i) => (
          <g key={i}>
            <circle cx={x*s} cy={y*s} r={r*s} fill="url(#s9-canopyShadow)" />
            <circle cx={(x-r*0.1)*s} cy={(y-r*0.1)*s} r={r*0.85*s} fill="url(#s9-canopyBase)" />
            <circle cx={(x-r*0.2)*s} cy={(y-r*0.25)*s} r={r*0.6*s} fill="url(#s9-canopyHighlight)" />
            <path d={`M ${(x-r*0.6)*s} ${(y-r*0.4)*s} Q ${x*s} ${(y-r*0.9)*s} ${(x+r*0.4)*s} ${(y-r*0.6)*s}`} stroke="url(#s9-canopyRim)" strokeWidth={r*0.15*s} strokeLinecap="round" fill="none" opacity="0.9" />
          </g>
        ))}
      </g>

      {/* Falling Petals */}
      <g id="falling-petals">
        {fallingPetals.map(([x, y, rot], i) => (
          <path key={`fp${i}`} d={`M ${x*s} ${y*s} C ${(x-3)*s} ${(y-6)*s} ${(x+2)*s} ${(y-8)*s} ${(x+4)*s} ${(y-4)*s} C ${(x+6)*s} ${(y)*s} ${(x+3)*s} ${(y+2)*s} ${x*s} ${y*s} Z`} fill="#ff85b3" opacity="0.8" transform={`rotate(${rot} ${x*s} ${y*s})`} />
        ))}
        {fallingPetals.map(([x, y, rot], i) => (
           <path key={`fph${i}`} d={`M ${(x+15)*s} ${(y-10)*s} C ${(x+12)*s} ${(y-16)*s} ${(x+17)*s} ${(y-18)*s} ${(x+19)*s} ${(y-14)*s} C ${(x+21)*s} ${(y-10)*s} ${(x+18)*s} ${(y-8)*s} ${(x+15)*s} ${(y-10)*s} Z`} fill="#ffcce0" opacity="0.7" transform={`rotate(${rot-20} ${(x+15)*s} ${(y-10)*s})`} />
        ))}
      </g>

      <g id="glow">
        {motes.map(([x, y, r, op], i) => (
          <g key={`gm${i}`}>
            <circle cx={x*s} cy={y*s} r={r*3*s} fill="#ffcce0" opacity={(op as number) * 0.35} />
            <circle cx={x*s} cy={y*s} r={r*s} fill="#ffffff" opacity={op as number} />
          </g>
        ))}
      </g>
    </svg>
  );
}
