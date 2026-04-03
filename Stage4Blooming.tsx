export function Stage4Blooming({ viewBox = "200 260" }: { viewBox?: string }) {
  const [w, h] = viewBox.split(' ').map(Number);
  const s = w / 200;

  const grassTufts = [
    [10, 128, 6, -2], [12, 129, 4, 1], [15, 128, 5, 2],
    [35, 127, 7, -3], [38, 128, 5, 0], [42, 127, 6, 2],
    [75, 129, 5, -1], [78, 129, 8, 3], [82, 130, 4, 1],
    [120, 130, 7, -2], [124, 131, 5, 1], [128, 130, 6, 3],
    [165, 128, 5, -3], [168, 127, 8, 0], [172, 128, 6, 2],
    [190, 127, 7, -1], [195, 126, 5, 2]
  ];

  const wildFlowers = [
    [25, 135, 1.5, "#e86090"], [28, 137, 1.2, "#f080a8"], [22, 138, 1.8, "#c84070"],
    [150, 140, 1.6, "#e86090"], [155, 138, 1.3, "#f080a8"], [146, 142, 1.1, "#c84070"],
    [85, 145, 1.4, "#e86090"], [90, 148, 1.7, "#f080a8"],
  ];

  const motes = [
    [30, 80, 1.2, 0.4], [50, 45, 0.8, 0.6], [80, 20, 1.5, 0.3],
    [120, 30, 1.0, 0.5], [170, 60, 1.4, 0.3], [140, 95, 0.9, 0.5],
    [85, 70, 1.8, 0.2], [110, 60, 0.7, 0.7], [65, 100, 1.1, 0.4]
  ];

  return (
    <svg viewBox={`0 0 ${w} ${h}`} xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <defs>
        {/* Sky - Dawn/Sunrise Ghibli Style */}
        <linearGradient id="s4-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1c1b3d" />
          <stop offset="25%" stopColor="#30234f" />
          <stop offset="50%" stopColor="#54315f" />
          <stop offset="70%" stopColor="#8a4460" />
          <stop offset="85%" stopColor="#b36257" />
          <stop offset="100%" stopColor="#d99868" />
        </linearGradient>

        <radialGradient id="s4-sun" cx="50%" cy="85%" r="60%">
          <stop offset="0%" stopColor="#ffe6a0" stopOpacity="1" />
          <stop offset="10%" stopColor="#ffc478" stopOpacity="0.8" />
          <stop offset="30%" stopColor="#e87070" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#8a4460" stopOpacity="0" />
        </radialGradient>

        {/* Petals - Highly Detailed Gradients */}
        <radialGradient id="s4-petalOuter" cx="50%" cy="80%" r="90%">
          <stop offset="0%" stopColor="#e84078" />
          <stop offset="50%" stopColor="#f878a8" />
          <stop offset="100%" stopColor="#f4b8d0" />
        </radialGradient>

        <radialGradient id="s4-petalInner" cx="50%" cy="75%" r="80%">
          <stop offset="0%" stopColor="#d02860" />
          <stop offset="45%" stopColor="#f06090" />
          <stop offset="100%" stopColor="#fac8e0" />
        </radialGradient>

        <radialGradient id="s4-flowerGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ff4080" stopOpacity="0.4" />
          <stop offset="50%" stopColor="#ff70a0" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#ff70a0" stopOpacity="0" />
        </radialGradient>

        {/* Leaves and Ground */}
        <radialGradient id="s4-leafL" cx="10%" cy="10%" r="100%">
          <stop offset="0%" stopColor="#95d058" />
          <stop offset="60%" stopColor="#589535" />
          <stop offset="100%" stopColor="#2c5418" />
        </radialGradient>

        <radialGradient id="s4-leafR" cx="90%" cy="10%" r="100%">
          <stop offset="0%" stopColor="#a0d860" />
          <stop offset="60%" stopColor="#64a53c" />
          <stop offset="100%" stopColor="#325e1a" />
        </radialGradient>

        <linearGradient id="s4-ground" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#38542c" />
          <stop offset="100%" stopColor="#1a2e15" />
        </linearGradient>

        <linearGradient id="s4-soil" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2c221a" />
          <stop offset="100%" stopColor="#120c08" />
        </linearGradient>

        <linearGradient id="s4-stem" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#3a5830" />
          <stop offset="100%" stopColor="#5a8a48" />
        </linearGradient>
      </defs>

      <g id="bg-static">
        {/* Sky Backdrop */}
        <rect width={w} height={h} fill="url(#s4-sky)" />
        <rect width={w} height={h} fill="url(#s4-sun)" />

        {/* Glowing Light Rays */}
        <path d={`M ${100*s} ${115*s} L ${0*s} ${40*s} L ${0*s} ${0*s} Z`} fill="#ffea90" opacity="0.03" />
        <path d={`M ${100*s} ${115*s} L ${60*s} ${0*s} L ${120*s} ${0*s} Z`} fill="#ffea90" opacity="0.04" />
        <path d={`M ${100*s} ${115*s} L ${200*s} ${20*s} L ${200*s} ${60*s} Z`} fill="#ffea90" opacity="0.03" />

        {/* Clouds */}
        <g id="clouds" opacity="0.85">
          {/* Left Cloud */}
          <path d={`M ${20*s} ${50*s} Q ${20*s} ${40*s} ${30*s} ${40*s} Q ${35*s} ${30*s} ${45*s} ${32*s} Q ${55*s} ${25*s} ${65*s} ${35*s} Q ${75*s} ${35*s} ${75*s} ${45*s} L ${75*s} ${50*s} Z`} fill="#c86b72" opacity="0.3" />
          <path d={`M ${22*s} ${50*s} Q ${22*s} ${42*s} ${30*s} ${42*s} Q ${35*s} ${34*s} ${44*s} ${36*s} Q ${52*s} ${30*s} ${60*s} ${38*s} Q ${68*s} ${38*s} ${68*s} ${46*s} L ${68*s} ${50*s} Z`} fill="#d9827c" opacity="0.4" />
          <path d={`M ${25*s} ${50*s} Q ${25*s} ${45*s} ${31*s} ${45*s} Q ${35*s} ${38*s} ${42*s} ${40*s} Q ${48*s} ${35*s} ${55*s} ${41*s} Q ${60*s} ${41*s} ${60*s} ${47*s} L ${60*s} ${50*s} Z`} fill="#eba494" opacity="0.6" />
          <line x1={20*s} y1={50*s} x2={75*s} y2={50*s} stroke="#ffe6a0" strokeWidth={1*s} strokeLinecap="round" opacity="0.8" />
          
          {/* Right Cloud */}
          <path d={`M ${130*s} ${40*s} Q ${130*s} ${32*s} ${140*s} ${32*s} Q ${148*s} ${22*s} ${160*s} ${26*s} Q ${172*s} ${20*s} ${182*s} ${28*s} Q ${192*s} ${28*s} ${192*s} ${36*s} L ${192*s} ${40*s} Z`} fill="#c86b72" opacity="0.25" />
          <path d={`M ${132*s} ${40*s} Q ${132*s} ${35*s} ${140*s} ${35*s} Q ${146*s} ${26*s} ${158*s} ${30*s} Q ${168*s} ${25*s} ${176*s} ${31*s} Q ${184*s} ${31*s} ${184*s} ${37*s} L ${184*s} ${40*s} Z`} fill="#d9827c" opacity="0.35" />
          <path d={`M ${135*s} ${40*s} Q ${135*s} ${37*s} ${141*s} ${37*s} Q ${146*s} ${30*s} ${155*s} ${33*s} Q ${162*s} ${29*s} ${168*s} ${34*s} Q ${174*s} ${34*s} ${174*s} ${38*s} L ${174*s} ${40*s} Z`} fill="#eba494" opacity="0.5" />
          <line x1={130*s} y1={40*s} x2={192*s} y2={40*s} stroke="#ffe6a0" strokeWidth={1*s} strokeLinecap="round" opacity="0.7" />
        </g>

        {/* Hills */}
        <path d={`M 0 ${95*s} Q ${15*s} ${85*s} ${30*s} ${92*s} T ${65*s} ${88*s} T ${100*s} ${95*s} T ${135*s} ${85*s} T ${170*s} ${92*s} T ${200*s} ${88*s} L ${200*s} ${130*s} L 0 ${130*s} Z`} fill="#3a2545" opacity="0.6"/>
        <path d={`M 0 ${105*s} Q ${40*s} ${95*s} ${80*s} ${108*s} T ${160*s} ${102*s} T ${200*s} ${110*s} L ${200*s} ${140*s} L 0 ${140*s} Z`} fill="#4d3248" opacity="0.8"/>
        <path d={`M 0 ${118*s} Q ${50*s} ${108*s} ${100*s} ${115*s} T ${200*s} ${112*s} L ${200*s} ${150*s} L 0 ${150*s} Z`} fill="#603e45" opacity="0.9"/>

        {/* Meadow and Soil */}
        <path d={`M 0 ${128*s} Q ${60*s} ${124*s} ${120*s} ${130*s} T ${200*s} ${126*s} L ${200*s} ${260*s} L 0 ${260*s} Z`} fill="url(#s4-ground)" />
        <path d={`M 0 ${155*s} Q ${80*s} ${148*s} ${200*s} ${158*s} L ${200*s} ${260*s} L 0 ${260*s} Z`} fill="url(#s4-soil)" />

        {/* Grass Tufts */}
        {grassTufts.map(([x, y, h, c], i) => (
          <path key={`gt${i}`} 
                d={`M ${x*s} ${y*s} Q ${(x+c/2)*s} ${(y-h/2)*s} ${(x+c)*s} ${(y-h)*s}`} 
                stroke="#2c4420" strokeWidth={0.8*s} fill="none" strokeLinecap="round" />
        ))}

        {/* Foreground Ecosystem Blooms */}
        {wildFlowers.map(([x, y, r, c], i) => (
          <g key={`wf${i}`}>
            <circle cx={x*s} cy={y*s} r={r*3*s} fill={c as string} opacity="0.15" />
            <circle cx={(x-r*0.5)*s} cy={(y-r*0.5)*s} r={r*s} fill={c as string} opacity="0.9" />
            <circle cx={(x+r*0.8)*s} cy={(y-r*0.2)*s} r={r*0.8*s} fill="#ffb8d8" opacity="0.9" />
            <circle cx={x*s} cy={(y+r*0.5)*s} r={r*0.9*s} fill={c as string} opacity="0.8" />
          </g>
        ))}

        {/* Pebbles */}
        <ellipse cx={45*s} cy={165*s} rx={4*s} ry={2*s} fill="#302824" />
        <ellipse cx={44*s} cy={164*s} rx={2*s} ry={1*s} fill="#4a4038" opacity="0.6"/>
        <ellipse cx={160*s} cy={175*s} rx={5*s} ry={2.5*s} fill="#241e1a" />
        <ellipse cx={159*s} cy={174*s} rx={2.5*s} ry={1*s} fill="#38302a" opacity="0.5"/>
      </g>

      {/* Stem */}
      <g id="stem-1" style={{ transformOrigin: `${100*s}px ${155*s}px` }}>
        <path d={`M ${100*s} ${155*s} C ${97*s} ${125*s} ${103*s} ${95*s} ${100*s} ${42*s}`} 
              stroke="url(#s4-stem)" strokeWidth={3.5*s} fill="none" strokeLinecap="round" />
        <path d={`M ${99*s} ${155*s} C ${96*s} ${125*s} ${102*s} ${95*s} ${99*s} ${42*s}`} 
              stroke="#80b860" strokeWidth={0.8*s} fill="none" opacity="0.4" strokeLinecap="round" />
      </g>

      {/* Lower Leaves */}
      <g id="leaves-1" style={{ transformOrigin: `${100*s}px ${136*s}px` }}>
        {/* Left Leaf */}
        <path d={`M ${99*s} ${136*s} C ${85*s} ${142*s} ${65*s} ${130*s} ${55*s} ${112*s} C ${62*s} ${118*s} ${78*s} ${124*s} ${99*s} ${136*s} Z`} fill="url(#s4-leafL)" />
        <path d={`M ${99*s} ${136*s} C ${84*s} ${134*s} ${66*s} ${124*s} ${55*s} ${112*s}`} stroke="#3a6828" strokeWidth={0.6*s} fill="none" opacity="0.6" strokeLinecap="round" />
        <path d={`M ${88*s} ${131*s} Q ${82*s} ${126*s} ${80*s} ${120*s}`} stroke="#4a7838" strokeWidth={0.4*s} fill="none" opacity="0.4" strokeLinecap="round" />
        <path d={`M ${78*s} ${126*s} Q ${72*s} ${120*s} ${70*s} ${115*s}`} stroke="#4a7838" strokeWidth={0.3*s} fill="none" opacity="0.4" strokeLinecap="round" />
        <path d={`M ${68*s} ${120*s} Q ${62*s} ${116*s} ${60*s} ${113*s}`} stroke="#4a7838" strokeWidth={0.25*s} fill="none" opacity="0.4" strokeLinecap="round" />
        
        {/* Right Leaf */}
        <path d={`M ${101*s} ${135*s} C ${115*s} ${140*s} ${135*s} ${126*s} ${145*s} ${108*s} C ${138*s} ${116*s} ${122*s} ${122*s} ${101*s} ${135*s} Z`} fill="url(#s4-leafR)" />
        <path d={`M ${101*s} ${135*s} C ${116*s} ${134*s} ${134*s} ${121*s} ${145*s} ${108*s}`} stroke="#3a6828" strokeWidth={0.6*s} fill="none" opacity="0.6" strokeLinecap="round" />
        <path d={`M ${113*s} ${129*s} Q ${118*s} ${124*s} ${120*s} ${118*s}`} stroke="#4a7838" strokeWidth={0.4*s} fill="none" opacity="0.4" strokeLinecap="round" />
        <path d={`M ${123*s} ${124*s} Q ${128*s} ${118*s} ${130*s} ${112*s}`} stroke="#4a7838" strokeWidth={0.3*s} fill="none" opacity="0.4" strokeLinecap="round" />
        <path d={`M ${133*s} ${118*s} Q ${138*s} ${113*s} ${140*s} ${110*s}`} stroke="#4a7838" strokeWidth={0.25*s} fill="none" opacity="0.4" strokeLinecap="round" />
      </g>

      {/* Middle Leaves */}
      <g id="leaves-2" style={{ transformOrigin: `${100*s}px ${108*s}px` }}>
        {/* Left Leaf */}
        <path d={`M ${99*s} ${108*s} C ${88*s} ${112*s} ${72*s} ${102*s} ${65*s} ${88*s} C ${72*s} ${94*s} ${85*s} ${100*s} ${99*s} ${108*s} Z`} fill="url(#s4-leafL)" />
        <path d={`M ${99*s} ${108*s} C ${87*s} ${106*s} ${74*s} ${98*s} ${65*s} ${88*s}`} stroke="#3a6828" strokeWidth={0.5*s} fill="none" opacity="0.5" strokeLinecap="round" />
        <path d={`M ${88*s} ${103*s} Q ${83*s} ${98*s} ${80*s} ${93*s}`} stroke="#4a7838" strokeWidth={0.3*s} fill="none" opacity="0.4" strokeLinecap="round" />
        <path d={`M ${78*s} ${98*s} Q ${74*s} ${93*s} ${72*s} ${89*s}`} stroke="#4a7838" strokeWidth={0.25*s} fill="none" opacity="0.4" strokeLinecap="round" />
        
        {/* Right Leaf */}
        <path d={`M ${101*s} ${105*s} C ${112*s} ${108*s} ${128*s} ${96*s} ${138*s} ${82*s} C ${130*s} ${88*s} ${116*s} ${96*s} ${101*s} ${105*s} Z`} fill="url(#s4-leafR)" />
        <path d={`M ${101*s} ${105*s} C ${113*s} ${104*s} ${128*s} ${92*s} ${138*s} ${82*s}`} stroke="#3a6828" strokeWidth={0.5*s} fill="none" opacity="0.5" strokeLinecap="round" />
        <path d={`M ${112*s} ${99*s} Q ${118*s} ${94*s} ${120*s} ${89*s}`} stroke="#4a7838" strokeWidth={0.3*s} fill="none" opacity="0.4" strokeLinecap="round" />
        <path d={`M ${122*s} ${93*s} Q ${128*s} ${88*s} ${130*s} ${84*s}`} stroke="#4a7838" strokeWidth={0.25*s} fill="none" opacity="0.4" strokeLinecap="round" />
      </g>

      {/* Upper Leaves */}
      <g id="leaves-3" style={{ transformOrigin: `${100*s}px ${78*s}px` }}>
        {/* Left Leaf */}
        <path d={`M ${99*s} ${78*s} C ${92*s} ${80*s} ${84*s} ${72*s} ${82*s} ${60*s} C ${88*s} ${66*s} ${94*s} ${72*s} ${99*s} ${78*s} Z`} fill="url(#s4-leafL)" />
        <path d={`M ${99*s} ${78*s} C ${91*s} ${75*s} ${84*s} ${66*s} ${82*s} ${60*s}`} stroke="#3a6828" strokeWidth={0.4*s} fill="none" opacity="0.4" strokeLinecap="round" />
        
        {/* Right Leaf */}
        <path d={`M ${101*s} ${74*s} C ${108*s} ${76*s} ${116*s} ${68*s} ${120*s} ${56*s} C ${114*s} ${62*s} ${107*s} ${68*s} ${101*s} ${74*s} Z`} fill="url(#s4-leafR)" />
        <path d={`M ${101*s} ${74*s} C ${109*s} ${71*s} ${116*s} ${62*s} ${120*s} ${56*s}`} stroke="#3a6828" strokeWidth={0.4*s} fill="none" opacity="0.4" strokeLinecap="round" />
      </g>

      {/* Cherry Blossom Petals & Details */}
      <g id="petals" style={{ transformOrigin: `${100*s}px ${42*s}px` }}>
        {/* Glow Aura */}
        <circle cx={100*s} cy={42*s} r={32*s} fill="url(#s4-flowerGlow)" />

        {/* Sepals (under petals, peaking out at rotation gaps) */}
        {[36, 108, 180, 252, 324].map((angle, i) => (
          <g key={`sepal${i}`} transform={`rotate(${angle} ${100*s} ${42*s})`}>
            <path d={`M ${100*s} ${42*s} L ${95*s} ${16*s} L ${100*s} ${10*s} L ${105*s} ${16*s} Z`} fill="#3a6828" />
            <path d={`M ${100*s} ${42*s} L ${100*s} ${10*s} L ${105*s} ${16*s} Z`} fill="#588a3a" />
          </g>
        ))}

        {/* 5 Organic Petals */}
        {[0, 72, 144, 216, 288].map((angle, i) => (
          <g key={`petal${i}`} transform={`rotate(${angle} ${100*s} ${42*s})`}>
            {/* Outer shadow / base petal */}
            <path d={`M ${100*s} ${42*s} 
                       C ${96*s} ${36*s} ${88*s} ${26*s} ${92*s} ${14*s} 
                       C ${94*s} ${8*s} ${97*s} ${10*s} ${100*s} ${14*s} 
                       C ${103*s} ${10*s} ${106*s} ${8*s} ${108*s} ${14*s} 
                       C ${112*s} ${26*s} ${104*s} ${36*s} ${100*s} ${42*s} Z`} 
                  fill="url(#s4-petalOuter)" />
            {/* Inner bright petal */}
            <path d={`M ${100*s} ${40*s} 
                       C ${97*s} ${35*s} ${91*s} ${26*s} ${94*s} ${16*s} 
                       C ${96*s} ${11*s} ${98*s} ${12*s} ${100*s} ${15*s} 
                       C ${102*s} ${12*s} ${104*s} ${11*s} ${106*s} ${16*s} 
                       C ${109*s} ${26*s} ${103*s} ${35*s} ${100*s} ${40*s} Z`} 
                  fill="url(#s4-petalInner)" />
            {/* Veins */}
            <path d={`M ${100*s} ${38*s} Q ${96*s} ${28*s} ${95*s} ${18*s}`} stroke="#c82060" strokeWidth={0.5*s} fill="none" opacity={0.4} />
            <path d={`M ${100*s} ${38*s} Q ${104*s} ${28*s} ${105*s} ${18*s}`} stroke="#c82060" strokeWidth={0.5*s} fill="none" opacity={0.4} />
            <path d={`M ${100*s} ${39*s} L ${100*s} ${20*s}`} stroke="#d01850" strokeWidth={0.6*s} fill="none" opacity={0.5} />
          </g>
        ))}

        {/* Stamens */}
        {Array.from({length: 15}).map((_, i) => {
          const a = (Math.PI / 180) * (i * 24);
          const r1 = 3;
          const r2 = 10;
          const x1 = 100 + Math.cos(a) * r1;
          const y1 = 42 + Math.sin(a) * r1;
          const x2 = 100 + Math.cos(a) * r2;
          const y2 = 42 + Math.sin(a) * r2;
          return (
            <g key={`st${i}`}>
              <line x1={x1*s} y1={y1*s} x2={x2*s} y2={y2*s} stroke="#ffb8d8" strokeWidth={0.4*s} opacity={0.8} />
              <circle cx={x2*s} cy={y2*s} r={1.2*s} fill="#ffd860" />
              <circle cx={x2*s} cy={y2*s} r={0.6*s} fill="#ffffff" />
            </g>
          )
        })}

        {/* Center depth */}
        <circle cx={100*s} cy={42*s} r={4.5*s} fill="#d83060" opacity={0.8} />
        <circle cx={100*s} cy={42*s} r={2.5*s} fill="#a01840" />
        <circle cx={100*s} cy={42*s} r={1.2*s} fill="#500010" />
      </g>

      {/* Atmosphere / Motes */}
      <g id="glow">
        {motes.map(([x, y, r, op], i) => (
          <g key={`mote${i}`}>
            <circle cx={x*s} cy={y*s} r={r*3*s} fill="#ffd0a0" opacity={(op as number) * 0.3} />
            <circle cx={x*s} cy={y*s} r={r*s} fill="#ffffff" opacity={op as number} />
          </g>
        ))}
      </g>
    </svg>
  );
}
