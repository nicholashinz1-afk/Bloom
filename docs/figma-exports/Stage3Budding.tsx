export function Stage3Budding({ viewBox = "200 260" }: { viewBox?: string }) {
  const [w, h] = viewBox.split(' ').map(Number);
  const s = w / 200;

  const grassTufts = [
    [10, 138, 6, -2], [15, 139, 5, 2],
    [35, 137, 7, -3], [42, 138, 6, 2],
    [75, 139, 5, -1], [82, 140, 4, 1],
    [120, 140, 7, -2], [128, 141, 6, 3],
    [165, 138, 5, -3], [172, 139, 6, 2],
    [190, 137, 7, -1]
  ];

  const wildFlowers = [
    [25, 145, 1.2, "#e06898"], [150, 148, 1.0, "#d05888"],
    [85, 152, 1.4, "#e06898"]
  ];

  const motes = [
    [30, 90, 1.2, 0.4], [50, 55, 0.8, 0.6], [80, 40, 1.5, 0.3],
    [120, 60, 1.0, 0.5], [170, 70, 1.4, 0.3], [140, 100, 0.9, 0.5]
  ];

  return (
    <svg viewBox={`0 0 ${w} ${h}`} xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <defs>
        {/* Sunrise Breaking Sky */}
        <linearGradient id="s3-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#181838" />
          <stop offset="35%" stopColor="#302040" />
          <stop offset="60%" stopColor="#552c48" />
          <stop offset="85%" stopColor="#8a4450" />
          <stop offset="100%" stopColor="#c86b5c" />
        </linearGradient>

        <radialGradient id="s3-sunGlow" cx="50%" cy="85%" r="60%">
          <stop offset="0%" stopColor="#ffb078" stopOpacity="0.8" />
          <stop offset="30%" stopColor="#e86060" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#8a4450" stopOpacity="0" />
        </radialGradient>

        {/* Soil Gradients */}
        <linearGradient id="s3-ground" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#324828" />
          <stop offset="100%" stopColor="#1c2c1a" />
        </linearGradient>
        <linearGradient id="s3-soilA" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#251a14" />
          <stop offset="100%" stopColor="#120c08" />
        </linearGradient>

        {/* Stem Gradients */}
        <linearGradient id="s3-stem" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#3a5c2e" />
          <stop offset="50%" stopColor="#528842" />
          <stop offset="100%" stopColor="#68a855" />
        </linearGradient>

        {/* Leaves Gradients */}
        <radialGradient id="s3-leafL" cx="15%" cy="15%" r="100%">
          <stop offset="0%" stopColor="#9cdb72" />
          <stop offset="60%" stopColor="#5a9c38" />
          <stop offset="100%" stopColor="#2e6018" />
        </radialGradient>
        <radialGradient id="s3-leafR" cx="85%" cy="15%" r="100%">
          <stop offset="0%" stopColor="#a5e07a" />
          <stop offset="60%" stopColor="#64a53e" />
          <stop offset="100%" stopColor="#32621e" />
        </radialGradient>

        {/* Tulip Bud Gradients */}
        <radialGradient id="s3-budOuter" cx="40%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#f8a0d0" />
          <stop offset="40%" stopColor="#e84078" />
          <stop offset="100%" stopColor="#a01840" />
        </radialGradient>
        <radialGradient id="s3-budInner" cx="50%" cy="25%" r="65%">
          <stop offset="0%" stopColor="#fac8e0" />
          <stop offset="40%" stopColor="#f06090" />
          <stop offset="100%" stopColor="#b02050" />
        </radialGradient>
        
        <radialGradient id="s3-budGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ff4080" stopOpacity="0.3" />
          <stop offset="50%" stopColor="#ff70a0" stopOpacity="0.1" />
          <stop offset="100%" stopColor="#ff70a0" stopOpacity="0" />
        </radialGradient>

        <linearGradient id="s3-sepal" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#3a6828" />
          <stop offset="100%" stopColor="#7aae5a" />
        </linearGradient>
      </defs>

      <g id="bg-static">
        {/* Sky Background */}
        <rect width={w} height={h} fill="url(#s3-sky)" />
        <rect width={w} height={h} fill="url(#s3-sunGlow)" />

        {/* Light Rays */}
        <path d={`M ${100*s} ${130*s} L ${20*s} ${0*s} L ${80*s} ${0*s} Z`} fill="#ffc090" opacity="0.04" />
        <path d={`M ${100*s} ${130*s} L ${120*s} ${0*s} L ${180*s} ${0*s} Z`} fill="#ffc090" opacity="0.03" />

        {/* Dawn Clouds */}
        <g id="clouds" opacity="0.75">
          <path d={`M ${20*s} ${65*s} Q ${35*s} ${55*s} ${55*s} ${60*s} T ${80*s} ${58*s} L ${80*s} ${70*s} L ${20*s} ${70*s} Z`} fill="#8a4450" opacity="0.4" />
          <path d={`M ${22*s} ${65*s} Q ${35*s} ${58*s} ${53*s} ${62*s} T ${78*s} ${61*s} L ${78*s} ${70*s} L ${22*s} ${70*s} Z`} fill="#a8555c" opacity="0.5" />
          <line x1={20*s} y1={70*s} x2={80*s} y2={70*s} stroke="#ffb078" strokeWidth={0.8*s} strokeLinecap="round" opacity="0.8" />

          <path d={`M ${140*s} ${50*s} Q ${155*s} ${42*s} ${170*s} ${48*s} T ${195*s} ${45*s} L ${195*s} ${55*s} L ${140*s} ${55*s} Z`} fill="#8a4450" opacity="0.3" />
          <path d={`M ${142*s} ${50*s} Q ${155*s} ${45*s} ${168*s} ${50*s} T ${193*s} ${48*s} L ${193*s} ${55*s} L ${142*s} ${55*s} Z`} fill="#a8555c" opacity="0.4" />
          <line x1={140*s} y1={55*s} x2={195*s} y2={55*s} stroke="#ffb078" strokeWidth={0.8*s} strokeLinecap="round" opacity="0.7" />
        </g>

        {/* Hills silhouettes */}
        <path d={`M 0 ${105*s} Q ${35*s} ${95*s} ${70*s} ${102*s} T ${140*s} ${98*s} T ${200*s} ${105*s} L ${200*s} ${140*s} L 0 ${140*s} Z`} fill="#2d2232" opacity="0.7" />
        <path d={`M 0 ${115*s} Q ${45*s} ${108*s} ${90*s} ${116*s} T ${180*s} ${110*s} T ${200*s} ${115*s} L ${200*s} ${145*s} L 0 ${145*s} Z`} fill="#382830" opacity="0.8" />

        {/* Meadow and Soil */}
        <path d={`M 0 ${130*s} Q ${60*s} ${124*s} ${120*s} ${132*s} T ${200*s} ${128*s} L ${200*s} ${260*s} L 0 ${260*s} Z`} fill="url(#s3-ground)" />
        <path d={`M 0 ${160*s} Q ${80*s} ${154*s} ${200*s} ${162*s} L ${200*s} ${260*s} L 0 ${260*s} Z`} fill="url(#s3-soilA)" />

        {/* Grass Tufts */}
        {grassTufts.map(([x, y, h, c], i) => (
          <path key={`gt${i}`} 
                d={`M ${x*s} ${y*s} Q ${(x+c/2)*s} ${(y-h/2)*s} ${(x+c)*s} ${(y-h)*s}`} 
                stroke="#26381e" strokeWidth={0.8*s} fill="none" strokeLinecap="round" />
        ))}

        {/* Initial Wildflowers */}
        {wildFlowers.map(([x, y, r, c], i) => (
          <g key={`wf${i}`}>
            <circle cx={x*s} cy={y*s} r={r*3*s} fill={c as string} opacity="0.1" />
            <circle cx={x*s} cy={y*s} r={r*s} fill={c as string} opacity="0.8" />
            <circle cx={(x+r*0.5)*s} cy={(y-r*0.5)*s} r={r*0.6*s} fill="#ffb8d8" opacity="0.9" />
          </g>
        ))}

        {/* Pebbles */}
        <ellipse cx={48*s} cy={168*s} rx={4.5*s} ry={2.5*s} fill="#2e2522" transform={`rotate(5 ${48*s} ${168*s})`} />
        <ellipse cx={155*s} cy={172*s} rx={6*s} ry={3.5*s} fill="#241c18" transform={`rotate(-8 ${155*s} ${172*s})`} />
      </g>

      {/* Stem */}
      <g id="stem-1" style={{ transformOrigin: `${100*s}px ${160*s}px` }}>
        <path d={`M ${100*s} ${162*s} 
                   C ${97*s} ${135*s} ${103*s} ${105*s} ${100*s} ${65*s}`} 
              stroke="url(#s3-stem)" strokeWidth={3.2*s} fill="none" strokeLinecap="round" />
        <path d={`M ${99*s} ${160*s} 
                   C ${96*s} ${135*s} ${102*s} ${105*s} ${99*s} ${65*s}`} 
              stroke="#80c865" strokeWidth={0.6*s} fill="none" strokeLinecap="round" opacity="0.4" />
      </g>

      {/* Lower Leaves */}
      <g id="leaves-1" style={{ transformOrigin: `${100*s}px ${142*s}px` }}>
        {/* Left Leaf */}
        <path d={`M ${99*s} ${142*s} 
                   C ${86*s} ${146*s} ${68*s} ${134*s} ${60*s} ${118*s} 
                   C ${66*s} ${122*s} ${82*s} ${128*s} ${99*s} ${142*s} Z`} 
              fill="url(#s3-leafL)" />
        <path d={`M ${99*s} ${142*s} C ${85*s} ${138*s} ${70*s} ${126*s} ${60*s} ${118*s}`} stroke="#3a6828" strokeWidth={0.6*s} fill="none" opacity="0.6" strokeLinecap="round" />
        <path d={`M ${90*s} ${135*s} Q ${84*s} ${130*s} ${82*s} ${124*s}`} stroke="#4a7838" strokeWidth={0.4*s} fill="none" opacity="0.4" strokeLinecap="round" />

        {/* Right Leaf */}
        <path d={`M ${101*s} ${142*s} 
                   C ${114*s} ${146*s} ${132*s} ${134*s} ${140*s} ${118*s} 
                   C ${134*s} ${122*s} ${118*s} ${128*s} ${101*s} ${142*s} Z`} 
              fill="url(#s3-leafR)" />
        <path d={`M ${101*s} ${142*s} C ${115*s} ${138*s} ${130*s} ${126*s} ${140*s} ${118*s}`} stroke="#3a6828" strokeWidth={0.6*s} fill="none" opacity="0.6" strokeLinecap="round" />
        <path d={`M ${110*s} ${135*s} Q ${116*s} ${130*s} ${118*s} ${124*s}`} stroke="#4a7838" strokeWidth={0.4*s} fill="none" opacity="0.4" strokeLinecap="round" />
      </g>

      {/* Middle Leaves */}
      <g id="leaves-2" style={{ transformOrigin: `${100*s}px ${115*s}px` }}>
        {/* Left Leaf */}
        <path d={`M ${99*s} ${115*s} C ${88*s} ${118*s} ${72*s} ${108*s} ${66*s} ${94*s} C ${74*s} ${100*s} ${86*s} ${106*s} ${99*s} ${115*s} Z`} fill="url(#s3-leafL)" />
        <path d={`M ${99*s} ${115*s} C ${88*s} ${112*s} ${75*s} ${104*s} ${66*s} ${94*s}`} stroke="#3a6828" strokeWidth={0.5*s} fill="none" opacity="0.5" strokeLinecap="round" />

        {/* Right Leaf */}
        <path d={`M ${101*s} ${115*s} C ${112*s} ${118*s} ${128*s} ${108*s} ${134*s} ${94*s} C ${126*s} ${100*s} ${114*s} ${106*s} ${101*s} ${115*s} Z`} fill="url(#s3-leafR)" />
        <path d={`M ${101*s} ${115*s} C ${112*s} ${112*s} ${125*s} ${104*s} ${134*s} ${94*s}`} stroke="#3a6828" strokeWidth={0.5*s} fill="none" opacity="0.5" strokeLinecap="round" />
      </g>

      {/* Upper Leaves */}
      <g id="leaves-3" style={{ transformOrigin: `${100*s}px ${88*s}px` }}>
        <path d={`M ${99*s} ${88*s} C ${92*s} ${90*s} ${84*s} ${82*s} ${80*s} ${72*s} C ${86*s} ${78*s} ${94*s} ${84*s} ${99*s} ${88*s} Z`} fill="url(#s3-leafL)" />
        <path d={`M ${99*s} ${88*s} C ${92*s} ${86*s} ${85*s} ${78*s} ${80*s} ${72*s}`} stroke="#3a6828" strokeWidth={0.4*s} fill="none" opacity="0.4" strokeLinecap="round" />

        <path d={`M ${101*s} ${88*s} C ${108*s} ${90*s} ${116*s} ${82*s} ${120*s} ${72*s} C ${114*s} ${78*s} ${106*s} ${84*s} ${101*s} ${88*s} Z`} fill="url(#s3-leafR)" />
        <path d={`M ${101*s} ${88*s} C ${108*s} ${86*s} ${115*s} ${78*s} ${120*s} ${72*s}`} stroke="#3a6828" strokeWidth={0.4*s} fill="none" opacity="0.4" strokeLinecap="round" />
      </g>

      {/* The Tulip Bud (Rich Magenta, Fully closed but textured) */}
      <g id="bud" style={{ transformOrigin: `${100*s}px ${60*s}px` }}>
        <circle cx={100*s} cy={55*s} r={28*s} fill="url(#s3-budGlow)" />

        {/* Outer Back Petal */}
        <path d={`M ${100*s} ${66*s} 
                   C ${86*s} ${64*s} ${80*s} ${48*s} ${86*s} ${36*s} 
                   C ${92*s} ${28*s} ${100*s} ${25*s} ${100*s} ${25*s} 
                   C ${100*s} ${25*s} ${108*s} ${28*s} ${114*s} ${36*s} 
                   C ${120*s} ${48*s} ${114*s} ${64*s} ${100*s} ${66*s} Z`} 
              fill="url(#s3-budOuter)" />

        {/* Left Inner Fold */}
        <path d={`M ${100*s} ${65*s} 
                   C ${90*s} ${62*s} ${86*s} ${48*s} ${90*s} ${38*s} 
                   C ${94*s} ${32*s} ${100*s} ${28*s} ${100*s} ${28*s} 
                   L ${100*s} ${65*s} Z`} 
              fill="url(#s3-budInner)" />

        {/* Right Inner Fold */}
        <path d={`M ${100*s} ${65*s} 
                   C ${110*s} ${62*s} ${114*s} ${48*s} ${110*s} ${38*s} 
                   C ${106*s} ${32*s} ${100*s} ${28*s} ${100*s} ${28*s} 
                   L ${100*s} ${65*s} Z`} 
              fill="#e84078" opacity="0.8" />

        {/* Central Ridge Highlight */}
        <path d={`M ${100*s} ${65*s} C ${98*s} ${50*s} ${98*s} ${40*s} ${100*s} ${28*s}`} stroke="#ff80b0" strokeWidth={0.8*s} fill="none" strokeLinecap="round" opacity="0.6" />
        
        {/* Veins */}
        <path d={`M ${95*s} ${62*s} C ${91*s} ${52*s} ${90*s} ${44*s} ${92*s} ${36*s}`} stroke="#801030" strokeWidth={0.4*s} fill="none" opacity="0.3" />
        <path d={`M ${105*s} ${62*s} C ${109*s} ${52*s} ${110*s} ${44*s} ${108*s} ${36*s}`} stroke="#801030" strokeWidth={0.4*s} fill="none" opacity="0.3" />

        {/* Left Sepal Wrapping Bud */}
        <path d={`M ${100*s} ${68*s} C ${92*s} ${66*s} ${84*s} ${58*s} ${86*s} ${48*s} C ${88*s} ${44*s} ${90*s} ${45*s} ${92*s} ${48*s} C ${94*s} ${54*s} ${96*s} ${62*s} ${100*s} ${68*s} Z`} fill="url(#s3-sepal)" />
        <path d={`M ${97*s} ${65*s} C ${92*s} ${60*s} ${88*s} ${54*s} ${88*s} ${48*s}`} stroke="#26481a" strokeWidth={0.3*s} fill="none" opacity="0.5" />

        {/* Right Sepal Wrapping Bud */}
        <path d={`M ${100*s} ${68*s} C ${108*s} ${66*s} ${116*s} ${58*s} ${114*s} ${48*s} C ${112*s} ${44*s} ${110*s} ${45*s} ${108*s} ${48*s} C ${106*s} ${54*s} ${104*s} ${62*s} ${100*s} ${68*s} Z`} fill="url(#s3-sepal)" />
        <path d={`M ${103*s} ${65*s} C ${108*s} ${60*s} ${112*s} ${54*s} ${112*s} ${48*s}`} stroke="#26481a" strokeWidth={0.3*s} fill="none" opacity="0.5" />
      </g>

      {/* Dawn Motes */}
      <g id="glow">
        {motes.map(([x, y, r, op], i) => (
          <g key={`gm${i}`}>
            <circle cx={x*s} cy={y*s} r={r*3*s} fill="#ffb078" opacity={(op as number) * 0.25} />
            <circle cx={x*s} cy={y*s} r={r*s} fill="#ffe8d0" opacity={op as number} />
          </g>
        ))}
      </g>
    </svg>
  );
}
