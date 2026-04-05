export function Stage1Seedling({ viewBox = "200 260" }: { viewBox?: string }) {
  const [w, h] = viewBox.split(' ').map(Number);
  const s = w / 200;

  const stars = [
    [30, 20, 0.8, 0.4], [75, 15, 1.2, 0.5], [165, 25, 1.0, 0.4],
    [130, 40, 0.6, 0.3], [95, 50, 0.5, 0.2], [40, 55, 0.7, 0.3], 
    [180, 45, 0.8, 0.4], [110, 20, 1.0, 0.5], [10, 35, 0.6, 0.2]
  ];

  const grassTufts = [
    [15, 138, 5, -2], [45, 136, 6, 2],
    [85, 138, 4, -1], [115, 137, 5, 2],
    [155, 138, 6, -3], [185, 136, 5, 1]
  ];

  const motes = [
    [50, 100, 1.0, 0.4], [130, 80, 1.2, 0.5], [80, 110, 0.8, 0.3],
    [160, 120, 1.1, 0.6], [30, 130, 0.9, 0.4]
  ];

  return (
    <svg viewBox={`0 0 ${w} ${h}`} xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <defs>
        {/* Late Night / Pre-Dawn Sky */}
        <linearGradient id="s1-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0a1020" />
          <stop offset="40%" stopColor="#141a2e" />
          <stop offset="70%" stopColor="#1c2842" />
          <stop offset="100%" stopColor="#2c3a55" />
        </linearGradient>

        <radialGradient id="s1-dawnGlow" cx="60%" cy="85%" r="60%">
          <stop offset="0%" stopColor="#3b2c45" stopOpacity="0.4" />
          <stop offset="50%" stopColor="#242845" stopOpacity="0.1" />
          <stop offset="100%" stopColor="#1c2842" stopOpacity="0" />
        </radialGradient>

        <radialGradient id="s1-starG" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#c0d0e0" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#c0d0e0" stopOpacity="0" />
        </radialGradient>

        {/* Soil Gradients */}
        <linearGradient id="s1-soilA" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2e3828" />
          <stop offset="50%" stopColor="#22281e" />
          <stop offset="100%" stopColor="#161814" />
        </linearGradient>
        <linearGradient id="s1-soilB" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1a2016" />
          <stop offset="100%" stopColor="#0e120c" />
        </linearGradient>

        {/* Seed Gradients */}
        <radialGradient id="s1-seedOuter" cx="45%" cy="35%" r="60%">
          <stop offset="0%" stopColor="#6a5440" />
          <stop offset="50%" stopColor="#453225" />
          <stop offset="100%" stopColor="#281a14" />
        </radialGradient>

        {/* Stem Gradients */}
        <linearGradient id="s1-stem" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#45603a" />
          <stop offset="50%" stopColor="#609055" />
          <stop offset="100%" stopColor="#80bc75" />
        </linearGradient>

        {/* Cotyledon Leaves */}
        <radialGradient id="s1-leafL" cx="20%" cy="20%" r="90%">
          <stop offset="0%" stopColor="#a0df80" />
          <stop offset="60%" stopColor="#60a545" />
          <stop offset="100%" stopColor="#356525" />
        </radialGradient>

        <radialGradient id="s1-leafR" cx="80%" cy="20%" r="90%">
          <stop offset="0%" stopColor="#a8e588" />
          <stop offset="60%" stopColor="#6aa84c" />
          <stop offset="100%" stopColor="#3c6a28" />
        </radialGradient>
      </defs>

      <g id="bg-static">
        {/* Sky */}
        <rect width={w} height={h} fill="url(#s1-sky)" />
        <rect width={w} height={h} fill="url(#s1-dawnGlow)" />

        {/* Stars */}
        {stars.map(([x, y, r, op], i) => (
          <g key={`st${i}`}>
            <circle cx={x*s} cy={y*s} r={r*s} fill="#c0d0e0" opacity={op as number} />
            <circle cx={x*s} cy={y*s} r={r*3*s} fill="url(#s1-starG)" opacity={op as number} />
          </g>
        ))}

        {/* Distant Hills */}
        <path d={`M 0 ${120*s} Q ${25*s} ${112*s} ${50*s} ${120*s} T ${110*s} ${116*s} T ${160*s} ${110*s} T ${200*s} ${118*s} L ${200*s} ${145*s} L 0 ${145*s} Z`} fill="#141c28" opacity="0.85" />
        <path d={`M 0 ${128*s} Q ${45*s} ${122*s} ${95*s} ${130*s} T ${185*s} ${125*s} T ${200*s} ${130*s} L ${200*s} ${155*s} L 0 ${155*s} Z`} fill="#18222c" opacity="0.9" />

        {/* Soil / Ground */}
        <path d={`M 0 ${138*s} Q ${50*s} ${134*s} ${100*s} ${140*s} T ${200*s} ${136*s} L ${200*s} ${260*s} L 0 ${260*s} Z`} fill="url(#s1-soilA)" />
        <path d={`M 0 ${160*s} Q ${75*s} ${155*s} ${200*s} ${165*s} L ${200*s} ${260*s} L 0 ${260*s} Z`} fill="url(#s1-soilB)" />

        {/* Grass Tufts */}
        {grassTufts.map(([x, y, h, c], i) => (
          <path key={`gt${i}`} 
                d={`M ${x*s} ${y*s} Q ${(x+c/2)*s} ${(y-h/2)*s} ${(x+c)*s} ${(y-h)*s}`} 
                stroke="#2a3c20" strokeWidth={0.8*s} fill="none" strokeLinecap="round" />
        ))}

        {/* Dew drops */}
        <circle cx={48*s} cy={134*s} r={1.0*s} fill="#6a95a8" opacity="0.4" />
        <circle cx={47.7*s} cy={133.7*s} r={0.4*s} fill="#88b5c8" opacity="0.5" />
        <circle cx={152*s} cy={135*s} r={0.8*s} fill="#6a95a8" opacity="0.3" />

        {/* Pebbles */}
        <ellipse cx={55*s} cy={148*s} rx={4.5*s} ry={2.5*s} fill="#24282a" transform={`rotate(8 ${55*s} ${148*s})`} />
        <ellipse cx={54*s} cy={147*s} rx={2*s} ry={1*s} fill="#353b3e" opacity="0.5" transform={`rotate(8 ${54*s} ${147*s})`} />
        <ellipse cx={145*s} cy={155*s} rx={6*s} ry={3*s} fill="#1e2224" transform={`rotate(-12 ${145*s} ${155*s})`} />
        <ellipse cx={144*s} cy={154*s} rx={3*s} ry={1.5*s} fill="#2c3234" opacity="0.4" transform={`rotate(-12 ${144*s} ${154*s})`} />

        {/* Glowing Atmosphere Motes */}
        {motes.map(([x, y, r, op], i) => (
          <g key={`gm${i}`}>
            <circle cx={x*s} cy={y*s} r={r*3*s} fill="#a8e5cc" opacity={(op as number) * 0.15} />
            <circle cx={x*s} cy={y*s} r={r*s} fill="#ccffea" opacity={op as number} />
          </g>
        ))}
      </g>

      {/* The Seed (Cracked Open) */}
      <g id="seed" style={{ transformOrigin: `${100*s}px ${168*s}px` }}>
        {/* Left Shell Half */}
        <path d={`M ${100*s} ${174*s} 
                   C ${96*s} ${176*s} ${88*s} ${172*s} ${85*s} ${165*s} 
                   C ${82*s} ${158*s} ${90*s} ${154*s} ${96*s} ${156*s} 
                   C ${97*s} ${158*s} ${96*s} ${162*s} ${99*s} ${165*s} 
                   C ${97*s} ${168*s} ${96*s} ${172*s} ${100*s} ${174*s} Z`} 
              fill="url(#s1-seedOuter)" />
        {/* Right Shell Half */}
        <path d={`M ${100*s} ${174*s} 
                   C ${104*s} ${176*s} ${112*s} ${172*s} ${115*s} ${165*s} 
                   C ${118*s} ${158*s} ${110*s} ${154*s} ${104*s} ${156*s} 
                   C ${103*s} ${158*s} ${104*s} ${162*s} ${101*s} ${165*s} 
                   C ${103*s} ${168*s} ${104*s} ${172*s} ${100*s} ${174*s} Z`} 
              fill="url(#s1-seedOuter)" />

        {/* Shadow inside the shell */}
        <path d={`M ${100*s} ${174*s} C ${96*s} ${168*s} ${99*s} ${164*s} ${96*s} ${158*s} C ${100*s} ${162*s} ${100*s} ${168*s} ${100*s} ${174*s} Z`} fill="#160e0a" opacity="0.6" />
        <path d={`M ${100*s} ${174*s} C ${104*s} ${168*s} ${101*s} ${164*s} ${104*s} ${158*s} C ${100*s} ${162*s} ${100*s} ${168*s} ${100*s} ${174*s} Z`} fill="#160e0a" opacity="0.6" />

        {/* Textures */}
        <path d={`M ${90*s} ${160*s} C ${93*s} ${158*s} ${95*s} ${160*s} ${98*s} ${159*s}`} stroke="#352215" strokeWidth={0.5*s} fill="none" opacity="0.5" />
        <path d={`M ${88*s} ${165*s} C ${92*s} ${163*s} ${94*s} ${166*s} ${97*s} ${164*s}`} stroke="#352215" strokeWidth={0.6*s} fill="none" opacity="0.4" />
        <path d={`M ${110*s} ${160*s} C ${107*s} ${158*s} ${105*s} ${160*s} ${102*s} ${159*s}`} stroke="#352215" strokeWidth={0.5*s} fill="none" opacity="0.5" />
        <path d={`M ${112*s} ${165*s} C ${108*s} ${163*s} ${106*s} ${166*s} ${103*s} ${164*s}`} stroke="#352215" strokeWidth={0.6*s} fill="none" opacity="0.4" />

        {/* Sub-soil roots */}
        <path d={`M ${97*s} ${174*s} C ${93*s} ${178*s} ${90*s} ${185*s} ${85*s} ${192*s}`} stroke="#352518" strokeWidth={0.8*s} fill="none" strokeLinecap="round" opacity="0.4" />
        <path d={`M ${103*s} ${174*s} C ${107*s} ${178*s} ${110*s} ${185*s} ${115*s} ${192*s}`} stroke="#352518" strokeWidth={0.8*s} fill="none" strokeLinecap="round" opacity="0.4" />
      </g>

      {/* Stem */}
      <g id="stem-1" style={{ transformOrigin: `${100*s}px ${165*s}px` }}>
        <path d={`M ${100*s} ${166*s} 
                   C ${98*s} ${152*s} ${104*s} ${138*s} ${100*s} ${120*s}`} 
              stroke="url(#s1-stem)" strokeWidth={2.4*s} fill="none" strokeLinecap="round" />
        <path d={`M ${99.3*s} ${165*s} 
                   C ${97*s} ${152*s} ${103*s} ${138*s} ${99.2*s} ${120*s}`} 
              stroke="#a0df80" strokeWidth={0.5*s} fill="none" strokeLinecap="round" opacity="0.4" />
      </g>

      {/* Cotyledon Leaves */}
      <g id="leaves-1" style={{ transformOrigin: `${100*s}px ${122*s}px` }}>
        {/* Left Leaf */}
        <path d={`M ${100*s} ${122*s} 
                   C ${94*s} ${120*s} ${84*s} ${112*s} ${82*s} ${104*s} 
                   C ${80*s} ${96*s} ${84*s} ${92*s} ${90*s} ${94*s} 
                   C ${96*s} ${96*s} ${98*s} ${108*s} ${100*s} ${122*s} Z`} 
              fill="url(#s1-leafL)" />
        <path d={`M ${100*s} ${122*s} C ${94*s} ${116*s} ${88*s} ${106*s} ${82*s} ${104*s}`} 
              stroke="#3a6a28" strokeWidth={0.6*s} fill="none" opacity="0.6" strokeLinecap="round" />
        <path d={`M ${82*s} ${104*s} C ${84*s} ${108*s} ${86*s} ${112*s} ${88*s} ${114*s}`} 
              stroke="#ccffa8" strokeWidth={0.4*s} fill="none" opacity="0.3" strokeLinecap="round" />

        {/* Right Leaf */}
        <path d={`M ${100*s} ${122*s} 
                   C ${106*s} ${120*s} ${116*s} ${112*s} ${118*s} ${104*s} 
                   C ${120*s} ${96*s} ${116*s} ${92*s} ${110*s} ${94*s} 
                   C ${104*s} ${96*s} ${102*s} ${108*s} ${100*s} ${122*s} Z`} 
              fill="url(#s1-leafR)" />
        <path d={`M ${100*s} ${122*s} C ${106*s} ${116*s} ${112*s} ${106*s} ${118*s} ${104*s}`} 
              stroke="#3a6a28" strokeWidth={0.6*s} fill="none" opacity="0.6" strokeLinecap="round" />
        <path d={`M ${118*s} ${104*s} C ${116*s} ${108*s} ${114*s} ${112*s} ${112*s} ${114*s}`} 
              stroke="#ccffa8" strokeWidth={0.4*s} fill="none" opacity="0.25" strokeLinecap="round" />
      </g>
    </svg>
  );
}
