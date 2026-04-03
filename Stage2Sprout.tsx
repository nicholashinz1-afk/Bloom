export function Stage2Sprout({ viewBox = "200 260" }: { viewBox?: string }) {
  const [w, h] = viewBox.split(' ').map(Number);
  const s = w / 200;

  const stars = [
    [30, 20, 0.6, 0.25], [75, 15, 0.8, 0.3], [165, 25, 0.7, 0.2],
    [130, 40, 0.5, 0.15], [40, 55, 0.6, 0.2], [180, 45, 0.7, 0.25]
  ];

  const grassTufts = [
    [10, 138, 6, -2], [15, 139, 5, 2],
    [35, 137, 7, -3], [42, 138, 6, 2],
    [75, 139, 5, -1], [82, 140, 4, 1],
    [120, 140, 7, -2], [128, 141, 6, 3],
    [165, 138, 5, -3], [172, 139, 6, 2],
    [190, 137, 7, -1]
  ];

  const motes = [
    [30, 100, 1.2, 0.4], [50, 75, 0.8, 0.6], [80, 60, 1.5, 0.3],
    [120, 80, 1.0, 0.5], [170, 90, 1.4, 0.3], [140, 110, 0.9, 0.5]
  ];

  return (
    <svg viewBox={`0 0 ${w} ${h}`} xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <defs>
        {/* Early Dawn/Pre-Dawn Sky */}
        <linearGradient id="s2-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0d1428" />
          <stop offset="35%" stopColor="#1a2035" />
          <stop offset="65%" stopColor="#282c42" />
          <stop offset="100%" stopColor="#35304a" />
        </linearGradient>

        <radialGradient id="s2-horizonGlow" cx="65%" cy="85%" r="60%">
          <stop offset="0%" stopColor="#5e4555" stopOpacity="0.45" />
          <stop offset="40%" stopColor="#35304a" stopOpacity="0.1" />
          <stop offset="100%" stopColor="#282c42" stopOpacity="0" />
        </radialGradient>

        <radialGradient id="s2-starG" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#d0d0d0" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#d0d0d0" stopOpacity="0" />
        </radialGradient>

        {/* Mist/Fog Gradients */}
        <radialGradient id="s2-mist" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#68788a" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#68788a" stopOpacity="0" />
        </radialGradient>

        {/* Soil Gradients */}
        <linearGradient id="s2-ground" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#243828" />
          <stop offset="100%" stopColor="#18241c" />
        </linearGradient>
        <linearGradient id="s2-soilA" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1e1814" />
          <stop offset="100%" stopColor="#100b08" />
        </linearGradient>

        {/* Seed Gradients */}
        <radialGradient id="s2-seedOuter" cx="45%" cy="35%" r="60%">
          <stop offset="0%" stopColor="#554232" />
          <stop offset="50%" stopColor="#38281e" />
          <stop offset="100%" stopColor="#1e120e" />
        </radialGradient>

        {/* Stem Gradients */}
        <linearGradient id="s2-stem" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#3a5c2e" />
          <stop offset="50%" stopColor="#528842" />
          <stop offset="100%" stopColor="#75b25e" />
        </linearGradient>

        {/* Leaves Gradients */}
        <radialGradient id="s2-leafL" cx="20%" cy="20%" r="90%">
          <stop offset="0%" stopColor="#9ad572" />
          <stop offset="60%" stopColor="#589a38" />
          <stop offset="100%" stopColor="#2d5e1a" />
        </radialGradient>

        <radialGradient id="s2-leafR" cx="80%" cy="20%" r="90%">
          <stop offset="0%" stopColor="#a4db7a" />
          <stop offset="60%" stopColor="#62a23e" />
          <stop offset="100%" stopColor="#32621e" />
        </radialGradient>

        <radialGradient id="s2-leafUpperL" cx="20%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#aeea88" />
          <stop offset="100%" stopColor="#4a852c" />
        </radialGradient>
        
        <radialGradient id="s2-leafUpperR" cx="80%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#b2ed8e" />
          <stop offset="100%" stopColor="#528c30" />
        </radialGradient>
      </defs>

      <g id="bg-static">
        {/* Sky Background */}
        <rect width={w} height={h} fill="url(#s2-sky)" />
        <rect width={w} height={h} fill="url(#s2-horizonGlow)" />

        {/* Fading Stars */}
        {stars.map(([x, y, r, op], i) => (
          <g key={`st${i}`}>
            <circle cx={x*s} cy={y*s} r={r*s} fill="#d0d0d0" opacity={op as number} />
            <circle cx={x*s} cy={y*s} r={r*3*s} fill="url(#s2-starG)" opacity={op as number} />
          </g>
        ))}

        {/* Clouds / Dawn Mist in Sky */}
        <g id="clouds" opacity="0.6">
          <path d={`M ${140*s} ${35*s} Q ${150*s} ${25*s} ${165*s} ${30*s} T ${190*s} ${28*s} L ${190*s} ${40*s} L ${140*s} ${40*s} Z`} fill="#4a4055" opacity="0.4" />
          <path d={`M ${20*s} ${45*s} Q ${35*s} ${35*s} ${55*s} ${42*s} T ${80*s} ${38*s} L ${80*s} ${50*s} L ${20*s} ${50*s} Z`} fill="#403850" opacity="0.3" />
        </g>

        {/* Hills silhouettes */}
        <path d={`M 0 ${110*s} Q ${25*s} ${102*s} ${60*s} ${112*s} T ${130*s} ${106*s} T ${180*s} ${112*s} T ${200*s} ${108*s} L ${200*s} ${140*s} L 0 ${140*s} Z`} fill="#1c2432" opacity="0.8" />
        <path d={`M 0 ${120*s} Q ${45*s} ${114*s} ${100*s} ${122*s} T ${200*s} ${120*s} L ${200*s} ${150*s} L 0 ${150*s} Z`} fill="#222d38" opacity="0.9" />

        {/* Meadow and Soil */}
        <path d={`M 0 ${138*s} Q ${60*s} ${132*s} ${120*s} ${140*s} T ${200*s} ${136*s} L ${200*s} ${260*s} L 0 ${260*s} Z`} fill="url(#s2-ground)" />
        <path d={`M 0 ${165*s} Q ${80*s} ${158*s} ${200*s} ${168*s} L ${200*s} ${260*s} L 0 ${260*s} Z`} fill="url(#s2-soilA)" />

        {/* Low-lying mist on meadow */}
        <ellipse cx={50*s} cy={135*s} rx={45*s} ry={8*s} fill="url(#s2-mist)" />
        <ellipse cx={150*s} cy={138*s} rx={55*s} ry={10*s} fill="url(#s2-mist)" />

        {/* Grass Tufts */}
        {grassTufts.map(([x, y, h, c], i) => (
          <path key={`gt${i}`} 
                d={`M ${x*s} ${y*s} Q ${(x+c/2)*s} ${(y-h/2)*s} ${(x+c)*s} ${(y-h)*s}`} 
                stroke="#2a4220" strokeWidth={0.8*s} fill="none" strokeLinecap="round" />
        ))}

        {/* Dew Drops */}
        <circle cx={42*s} cy={135*s} r={1.2*s} fill="#7a9eb5" opacity="0.5" />
        <circle cx={41.6*s} cy={134.6*s} r={0.5*s} fill="#a4c6d6" opacity="0.6" />
        <circle cx={145*s} cy={138*s} r={1.0*s} fill="#7a9eb5" opacity="0.4" />
        
        {/* Pebbles */}
        <ellipse cx={50*s} cy={172*s} rx={4*s} ry={2*s} fill="#242220" />
        <ellipse cx={160*s} cy={175*s} rx={5.5*s} ry={3*s} fill="#1a1816" transform={`rotate(-10 ${160*s} ${175*s})`} />
      </g>

      {/* The Seed (Cracked & Buried) */}
      <g id="seed" style={{ transformOrigin: `${100*s}px ${170*s}px` }}>
        <path d={`M ${100*s} ${175*s} C ${95*s} ${178*s} ${85*s} ${172*s} ${82*s} ${165*s} C ${79*s} ${158*s} ${88*s} ${154*s} ${95*s} ${156*s} C ${96*s} ${158*s} ${95*s} ${162*s} ${98*s} ${165*s} C ${96*s} ${168*s} ${95*s} ${173*s} ${100*s} ${175*s} Z`} fill="url(#s2-seedOuter)" opacity="0.8" />
        <path d={`M ${100*s} ${175*s} C ${105*s} ${178*s} ${115*s} ${172*s} ${118*s} ${165*s} C ${121*s} ${158*s} ${112*s} ${154*s} ${105*s} ${156*s} C ${104*s} ${158*s} ${105*s} ${162*s} ${102*s} ${165*s} C ${104*s} ${168*s} ${105*s} ${173*s} ${100*s} ${175*s} Z`} fill="url(#s2-seedOuter)" opacity="0.8" />
        <path d={`M ${100*s} ${175*s} C ${95*s} ${168*s} ${98*s} ${164*s} ${95*s} ${158*s} C ${100*s} ${162*s} ${100*s} ${168*s} ${100*s} ${175*s} Z`} fill="#0d0a08" opacity="0.6" />
        <path d={`M ${100*s} ${175*s} C ${105*s} ${168*s} ${102*s} ${164*s} ${105*s} ${158*s} C ${100*s} ${162*s} ${100*s} ${168*s} ${100*s} ${175*s} Z`} fill="#0d0a08" opacity="0.6" />
      </g>

      {/* Stem */}
      <g id="stem-1" style={{ transformOrigin: `${100*s}px ${168*s}px` }}>
        <path d={`M ${100*s} ${168*s} 
                   C ${98*s} ${145*s} ${104*s} ${125*s} ${100*s} ${98*s} 
                   Q ${98*s} ${85*s} ${100*s} ${70*s}`} 
              stroke="url(#s2-stem)" strokeWidth={2.8*s} fill="none" strokeLinecap="round" />
        <path d={`M ${99.2*s} ${167*s} 
                   C ${97*s} ${145*s} ${103*s} ${125*s} ${99.2*s} ${98*s} 
                   Q ${97.2*s} ${85*s} ${99.2*s} ${70*s}`} 
              stroke="#aeea88" strokeWidth={0.6*s} fill="none" strokeLinecap="round" opacity="0.3" />
      </g>

      {/* Lower Leaves (Fully open cotyledons transitioning to true leaves) */}
      <g id="leaves-1" style={{ transformOrigin: `${100*s}px ${135*s}px` }}>
        {/* Left Leaf */}
        <path d={`M ${99*s} ${135*s} 
                   C ${88*s} ${138*s} ${72*s} ${125*s} ${68*s} ${112*s} 
                   C ${65*s} ${102*s} ${70*s} ${98*s} ${78*s} ${102*s} 
                   C ${86*s} ${106*s} ${92*s} ${118*s} ${99*s} ${135*s} Z`} 
              fill="url(#s2-leafL)" />
        <path d={`M ${99*s} ${135*s} C ${87*s} ${128*s} ${75*s} ${115*s} ${68*s} ${112*s}`} 
              stroke="#3a6828" strokeWidth={0.6*s} fill="none" opacity="0.6" strokeLinecap="round" />
        <path d={`M ${88*s} ${126*s} Q ${82*s} ${120*s} ${80*s} ${115*s}`} stroke="#4a7838" strokeWidth={0.4*s} fill="none" opacity="0.4" strokeLinecap="round" />
        <path d={`M ${78*s} ${118*s} Q ${72*s} ${115*s} ${70*s} ${110*s}`} stroke="#4a7838" strokeWidth={0.3*s} fill="none" opacity="0.4" strokeLinecap="round" />

        {/* Right Leaf */}
        <path d={`M ${101*s} ${135*s} 
                   C ${112*s} ${138*s} ${128*s} ${125*s} ${132*s} ${112*s} 
                   C ${135*s} ${102*s} ${130*s} ${98*s} ${122*s} ${102*s} 
                   C ${114*s} ${106*s} ${108*s} ${118*s} ${101*s} ${135*s} Z`} 
              fill="url(#s2-leafR)" />
        <path d={`M ${101*s} ${135*s} C ${113*s} ${128*s} ${125*s} ${115*s} ${132*s} ${112*s}`} 
              stroke="#3a6828" strokeWidth={0.6*s} fill="none" opacity="0.6" strokeLinecap="round" />
        <path d={`M ${112*s} ${126*s} Q ${118*s} ${120*s} ${120*s} ${115*s}`} stroke="#4a7838" strokeWidth={0.4*s} fill="none" opacity="0.4" strokeLinecap="round" />
        <path d={`M ${122*s} ${118*s} Q ${128*s} ${115*s} ${130*s} ${110*s}`} stroke="#4a7838" strokeWidth={0.3*s} fill="none" opacity="0.4" strokeLinecap="round" />
      </g>

      {/* Middle Leaves (New Growth) */}
      <g id="leaves-2" style={{ transformOrigin: `${100*s}px ${105*s}px` }}>
        {/* Left Leaf */}
        <path d={`M ${99*s} ${105*s} 
                   C ${94*s} ${106*s} ${82*s} ${98*s} ${78*s} ${88*s} 
                   C ${76*s} ${80*s} ${80*s} ${76*s} ${86*s} ${80*s} 
                   C ${92*s} ${84*s} ${96*s} ${95*s} ${99*s} ${105*s} Z`} 
              fill="url(#s2-leafUpperL)" />
        <path d={`M ${99*s} ${105*s} C ${92*s} ${98*s} ${84*s} ${90*s} ${78*s} ${88*s}`} 
              stroke="#3a6828" strokeWidth={0.5*s} fill="none" opacity="0.5" strokeLinecap="round" />
        <path d={`M ${90*s} ${97*s} Q ${85*s} ${92*s} ${83*s} ${88*s}`} stroke="#4a7838" strokeWidth={0.3*s} fill="none" opacity="0.4" strokeLinecap="round" />

        {/* Right Leaf */}
        <path d={`M ${101*s} ${105*s} 
                   C ${106*s} ${106*s} ${118*s} ${98*s} ${122*s} ${88*s} 
                   C ${124*s} ${80*s} ${120*s} ${76*s} ${114*s} ${80*s} 
                   C ${108*s} ${84*s} ${104*s} ${95*s} ${101*s} ${105*s} Z`} 
              fill="url(#s2-leafUpperR)" />
        <path d={`M ${101*s} ${105*s} C ${108*s} ${98*s} ${116*s} ${90*s} ${122*s} ${88*s}`} 
              stroke="#3a6828" strokeWidth={0.5*s} fill="none" opacity="0.5" strokeLinecap="round" />
        <path d={`M ${110*s} ${97*s} Q ${115*s} ${92*s} ${117*s} ${88*s}`} stroke="#4a7838" strokeWidth={0.3*s} fill="none" opacity="0.4" strokeLinecap="round" />
      </g>

      {/* Unfurling Tip Leaves */}
      <g id="leaves-3" style={{ transformOrigin: `${100*s}px ${72*s}px` }}>
        <path d={`M ${100*s} ${72*s} C ${96*s} ${70*s} ${88*s} ${62*s} ${86*s} ${55*s} C ${88*s} ${50*s} ${94*s} ${55*s} ${100*s} ${72*s} Z`} fill="url(#s2-leafUpperL)" />
        <path d={`M ${100*s} ${72*s} C ${104*s} ${70*s} ${112*s} ${62*s} ${114*s} ${55*s} C ${112*s} ${50*s} ${106*s} ${55*s} ${100*s} ${72*s} Z`} fill="url(#s2-leafUpperR)" />
      </g>

      {/* Atmospheric Dawn Motes */}
      <g id="glow">
        {motes.map(([x, y, r, op], i) => (
          <g key={`gm${i}`}>
            <circle cx={x*s} cy={y*s} r={r*3*s} fill="#e5d0a8" opacity={(op as number) * 0.2} />
            <circle cx={x*s} cy={y*s} r={r*s} fill="#ffeab5" opacity={op as number} />
          </g>
        ))}
      </g>
    </svg>
  );
}
