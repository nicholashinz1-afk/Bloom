export function Stage0Seed({ viewBox = "200 260" }: { viewBox?: string }) {
  const [w, h] = viewBox.split(' ').map(Number);
  const s = w / 200;

  const stars = [
    [25, 20, 1.0, 0.8], [75, 15, 1.5, 0.9], [165, 25, 1.2, 0.7],
    [130, 40, 0.8, 0.5], [95, 50, 0.7, 0.4], [150, 60, 0.6, 0.3],
    [40, 55, 0.9, 0.6], [180, 45, 1.0, 0.5], [110, 20, 1.2, 0.8],
    [10, 35, 0.8, 0.4], [60, 30, 0.7, 0.5], [190, 15, 0.9, 0.6]
  ];

  const motes = [
    [85, 150, 1.2, 0.6], [115, 145, 0.8, 0.5], [70, 160, 1.0, 0.4],
    [130, 155, 1.4, 0.7], [90, 135, 0.9, 0.5], [110, 165, 1.1, 0.6]
  ];

  return (
    <svg viewBox={`0 0 ${w} ${h}`} xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <defs>
        {/* Deep Magical Night Sky */}
        <linearGradient id="s0-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#070b19" />
          <stop offset="35%" stopColor="#0e152b" />
          <stop offset="70%" stopColor="#161c33" />
          <stop offset="100%" stopColor="#1e253c" />
        </linearGradient>

        <radialGradient id="s0-moonGlow" cx="80%" cy="20%" r="50%">
          <stop offset="0%" stopColor="#4a5578" stopOpacity="0.4" />
          <stop offset="50%" stopColor="#252b48" stopOpacity="0.1" />
          <stop offset="100%" stopColor="#161c33" stopOpacity="0" />
        </radialGradient>

        <radialGradient id="s0-starG" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#e2e8f0" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#e2e8f0" stopOpacity="0" />
        </radialGradient>

        {/* Soil Gradients */}
        <linearGradient id="s0-soilA" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2e2528" />
          <stop offset="50%" stopColor="#221b1e" />
          <stop offset="100%" stopColor="#181315" />
        </linearGradient>
        <linearGradient id="s0-soilB" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1e1719" />
          <stop offset="100%" stopColor="#100c0d" />
        </linearGradient>

        {/* Seed Gradients */}
        <radialGradient id="s0-seedOuter" cx="45%" cy="35%" r="60%">
          <stop offset="0%" stopColor="#7a5a40" />
          <stop offset="50%" stopColor="#4a3220" />
          <stop offset="100%" stopColor="#2a1810" />
        </radialGradient>

        <radialGradient id="s0-seedInnerGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#88e0a0" stopOpacity="1" />
          <stop offset="40%" stopColor="#50a068" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#285034" stopOpacity="0" />
        </radialGradient>

        <radialGradient id="s0-magicGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#60d090" stopOpacity="0.3" />
          <stop offset="50%" stopColor="#40a068" stopOpacity="0.1" />
          <stop offset="100%" stopColor="#40a068" stopOpacity="0" />
        </radialGradient>
      </defs>

      <g id="bg-static">
        {/* Sky Background */}
        <rect width={w} height={h} fill="url(#s0-sky)" />
        <rect width={w} height={h} fill="url(#s0-moonGlow)" />

        {/* Stars */}
        {stars.map(([x, y, r, op], i) => (
          <g key={`st${i}`}>
            <circle cx={x*s} cy={y*s} r={r*s} fill="#e2e8f0" opacity={op as number} />
            <circle cx={x*s} cy={y*s} r={r*4*s} fill="url(#s0-starG)" opacity={op as number} />
          </g>
        ))}

        {/* Distant Hills / Treeline Silhouette */}
        <path d={`M 0 ${115*s} Q ${15*s} ${108*s} ${35*s} ${112*s} T ${75*s} ${105*s} T ${120*s} ${110*s} T ${165*s} ${102*s} T ${200*s} ${108*s} L ${200*s} ${140*s} L 0 ${140*s} Z`} fill="#121626" opacity="0.8" />
        <path d={`M 0 ${125*s} Q ${40*s} ${118*s} ${90*s} ${125*s} T ${180*s} ${118*s} T ${200*s} ${122*s} L ${200*s} ${150*s} L 0 ${150*s} Z`} fill="#0e111c" opacity="0.9" />

        {/* Moonlight Light Rays */}
        <path d={`M ${160*s} ${0*s} L ${60*s} ${135*s} L ${120*s} ${135*s} Z`} fill="#88a0d0" opacity="0.04" />
        <path d={`M ${180*s} ${0*s} L ${100*s} ${135*s} L ${170*s} ${135*s} Z`} fill="#88a0d0" opacity="0.03" />

        {/* Ground / Soil Layers */}
        <path d={`M 0 ${135*s} Q ${50*s} ${130*s} ${100*s} ${134*s} T ${200*s} ${132*s} L ${200*s} ${260*s} L 0 ${260*s} Z`} fill="url(#s0-soilA)" />
        <path d={`M 0 ${165*s} Q ${80*s} ${158*s} ${200*s} ${168*s} L ${200*s} ${260*s} L 0 ${260*s} Z`} fill="url(#s0-soilB)" />

        {/* Deep Roots / Mycelium Textures */}
        <g stroke="#3a2a2e" strokeWidth={0.8*s} fill="none" strokeLinecap="round" opacity="0.6">
          <path d={`M ${20*s} ${150*s} Q ${25*s} ${160*s} ${35*s} ${165*s} T ${45*s} ${180*s}`} />
          <path d={`M ${180*s} ${155*s} Q ${175*s} ${165*s} ${165*s} ${170*s} T ${155*s} ${185*s}`} />
          <path d={`M ${40*s} ${200*s} Q ${50*s} ${210*s} ${65*s} ${205*s} T ${85*s} ${220*s}`} />
          <path d={`M ${160*s} ${210*s} Q ${150*s} ${220*s} ${135*s} ${215*s} T ${115*s} ${230*s}`} />
        </g>
        <g stroke="#504045" strokeWidth={0.4*s} fill="none" strokeLinecap="round" opacity="0.4">
          <path d={`M ${28*s} ${163*s} Q ${32*s} ${170*s} ${28*s} ${175*s}`} />
          <path d={`M ${170*s} ${167*s} Q ${166*s} ${172*s} ${172*s} ${178*s}`} />
        </g>

        {/* Bioluminescent Mushrooms / Flora */}
        <path d={`M ${145*s} ${140*s} C ${146*s} ${135*s} ${148*s} ${133*s} ${150*s} ${134*s}`} stroke="#4a6860" strokeWidth={0.8*s} fill="none" strokeLinecap="round" />
        <path d={`M ${146*s} ${134*s} Q ${150*s} ${130*s} ${154*s} ${135*s} Q ${150*s} ${133*s} ${146*s} ${134*s} Z`} fill="#88e0c0" opacity="0.8" />
        <circle cx={150*s} cy={133*s} r={4*s} fill="#88e0c0" opacity="0.2" />

        <path d={`M ${45*s} ${142*s} C ${44*s} ${138*s} ${42*s} ${136*s} ${40*s} ${137*s}`} stroke="#4a6860" strokeWidth={0.6*s} fill="none" strokeLinecap="round" />
        <path d={`M ${37*s} ${138*s} Q ${40*s} ${135*s} ${43*s} ${138*s} Q ${40*s} ${137*s} ${37*s} ${138*s} Z`} fill="#88e0c0" opacity="0.7" />
        <circle cx={40*s} cy={137*s} r={3*s} fill="#88e0c0" opacity="0.2" />

        {/* Pebbles */}
        <ellipse cx={60*s} cy={145*s} rx={6*s} ry={3*s} fill="#241e20" transform={`rotate(10 ${60*s} ${145*s})`} />
        <ellipse cx={58*s} cy={144*s} rx={3*s} ry={1.5*s} fill="#3a3034" opacity="0.6" transform={`rotate(10 ${58*s} ${144*s})`} />
        
        <ellipse cx={130*s} cy={165*s} rx={8*s} ry={4*s} fill="#181315" transform={`rotate(-15 ${130*s} ${165*s})`} />
        <ellipse cx={128*s} cy={163*s} rx={4*s} ry={2*s} fill="#2a2225" opacity="0.5" transform={`rotate(-15 ${128*s} ${163*s})`} />
      </g>

      {/* Bioluminescent Underground Motes */}
      <g id="glow">
        {motes.map(([x, y, r, op], i) => (
          <g key={`gm${i}`}>
            <circle cx={x*s} cy={y*s} r={r*4*s} fill="#60d090" opacity={(op as number) * 0.2} />
            <circle cx={x*s} cy={y*s} r={r*s} fill="#aaffcc" opacity={op as number} />
          </g>
        ))}
        {/* Large Magic Glow Aura Around Seed */}
        <circle cx={100*s} cy={180*s} r={35*s} fill="url(#s0-magicGlow)" />
        <circle cx={100*s} cy={180*s} r={18*s} fill="url(#s0-magicGlow)" opacity="0.6" />
      </g>

      {/* The Seed */}
      <g id="seed" style={{ transformOrigin: `${100*s}px ${180*s}px` }}>
        {/* Main Shell */}
        <path d={`M ${100*s} ${168*s} 
                   C ${106*s} ${168*s} ${112*s} ${174*s} ${114*s} ${182*s} 
                   C ${116*s} ${190*s} ${108*s} ${198*s} ${100*s} ${200*s} 
                   C ${92*s} ${198*s} ${84*s} ${190*s} ${86*s} ${182*s} 
                   C ${88*s} ${174*s} ${94*s} ${168*s} ${100*s} ${168*s} Z`} 
              fill="url(#s0-seedOuter)" />
        
        {/* Shell Textures */}
        <path d={`M ${95*s} ${172*s} C ${98*s} ${170*s} ${102*s} ${172*s} ${105*s} ${170*s}`} stroke="#3a2214" strokeWidth={0.6*s} fill="none" opacity="0.5" strokeLinecap="round" />
        <path d={`M ${92*s} ${178*s} C ${96*s} ${175*s} ${104*s} ${178*s} ${108*s} ${175*s}`} stroke="#3a2214" strokeWidth={0.8*s} fill="none" opacity="0.4" strokeLinecap="round" />
        <path d={`M ${90*s} ${186*s} C ${95*s} ${182*s} ${105*s} ${186*s} ${110*s} ${182*s}`} stroke="#2a140a" strokeWidth={0.8*s} fill="none" opacity="0.4" strokeLinecap="round" />
        <path d={`M ${94*s} ${194*s} C ${98*s} ${191*s} ${102*s} ${194*s} ${106*s} ${191*s}`} stroke="#2a140a" strokeWidth={0.6*s} fill="none" opacity="0.4" strokeLinecap="round" />
        
        {/* Seed Core / Glowing Crack */}
        <path d={`M ${100*s} ${174*s} 
                   C ${102*s} ${180*s} ${98*s} ${188*s} ${100*s} ${194*s} 
                   C ${101*s} ${188*s} ${104*s} ${180*s} ${100*s} ${174*s} Z`} 
              fill="url(#s0-seedInnerGlow)" opacity="0.9" />
        <path d={`M ${100*s} ${174*s} C ${101.5*s} ${180*s} ${98.5*s} ${188*s} ${100*s} ${194*s}`} 
              stroke="#aaffcc" strokeWidth={0.6*s} fill="none" opacity="0.8" />
        
        {/* Outer Shell Highlight */}
        <path d={`M ${90*s} ${182*s} C ${88*s} ${176*s} ${92*s} ${170*s} ${98*s} ${169*s}`} 
              stroke="#a07a58" strokeWidth={1*s} fill="none" strokeLinecap="round" opacity="0.4" />
      </g>
    </svg>
  );
}
