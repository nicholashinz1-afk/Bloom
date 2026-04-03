export function Stage13Ecosystem({ viewBox = "200 260" }: { viewBox?: string }) {
  const [w, h] = viewBox.split(' ').map(Number);
  const s = w / 200;

  const stars = [
    [25, 20, 1.0, 0.8], [75, 15, 1.5, 0.9], [165, 25, 1.2, 0.7],
    [130, 40, 0.8, 0.5], [95, 50, 0.7, 0.4], [150, 60, 0.6, 0.3],
    [40, 55, 0.9, 0.6], [180, 45, 1.0, 0.5], [110, 20, 1.2, 0.8]
  ];

  const motes = [
    [30, 150, 1.5, 0.6], [60, 120, 1.0, 0.8], [80, 135, 1.8, 0.5],
    [120, 145, 1.2, 0.7], [170, 160, 1.6, 0.5], [140, 115, 1.0, 0.8],
    [20, 130, 1.2, 0.6], [180, 135, 1.5, 0.7], [100, 120, 1.0, 0.9]
  ];

  const canopyClusters = [
    [100, -20, 130], [10, -10, 110], [190, -10, 110],
    [-30, 30, 90], [230, 30, 90], [50, 40, 80],
    [150, 40, 80], [100, 60, 90], [0, 80, 70],
    [200, 80, 70], [30, 100, 60], [170, 100, 60]
  ];

  const glowingLotuses = [
    [40, 70, 1.2, 10], [160, 80, 1.0, -15],
    [80, 50, 1.4, 5], [120, 60, 1.1, -10]
  ];

  return (
    <svg viewBox={`0 0 ${w} ${h}`} xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <defs>
        <linearGradient id="s13-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#10142b" />
          <stop offset="40%" stopColor="#2a1d40" />
          <stop offset="70%" stopColor="#5c2a52" />
          <stop offset="100%" stopColor="#10142b" />
        </linearGradient>
        <radialGradient id="s13-moonGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#b382e6" stopOpacity="0.4" />
          <stop offset="50%" stopColor="#5c2a52" stopOpacity="0.1" />
          <stop offset="100%" stopColor="#2a1d40" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="s13-starG" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#e2e8f0" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#e2e8f0" stopOpacity="0" />
        </radialGradient>

        <linearGradient id="s13-ground" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1c1622" />
          <stop offset="100%" stopColor="#0c0812" />
        </linearGradient>
        <linearGradient id="s13-soilA" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#120c16" />
          <stop offset="100%" stopColor="#060408" />
        </linearGradient>

        <linearGradient id="s13-trunk" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#120a16" />
          <stop offset="50%" stopColor="#22142a" />
          <stop offset="100%" stopColor="#331c3a" />
        </linearGradient>

        <radialGradient id="s13-canopyShadow" cx="50%" cy="60%" r="50%">
          <stop offset="0%" stopColor="#0c0612" />
          <stop offset="100%" stopColor="#060208" />
        </radialGradient>
        <radialGradient id="s13-canopyBase" cx="40%" cy="30%" r="60%">
          <stop offset="0%" stopColor="#2a1426" />
          <stop offset="100%" stopColor="#140812" />
        </radialGradient>
        <radialGradient id="s13-canopyHighlight" cx="30%" cy="30%" r="50%">
          <stop offset="0%" stopColor="#4a223c" />
          <stop offset="100%" stopColor="#2a1426" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="s13-canopyRim" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#b382e6" />
          <stop offset="100%" stopColor="#4a223c" stopOpacity="0" />
        </linearGradient>
        
        <radialGradient id="s13-magicGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#82e6d9" stopOpacity="0.8" />
          <stop offset="50%" stopColor="#4a8c99" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#4a8c99" stopOpacity="0" />
        </radialGradient>
      </defs>

      <g id="bg-static">
        <rect width={w} height={h} fill="url(#s13-sky)" />
        <rect width={w} height={h} fill="url(#s13-moonGlow)" />

        {stars.map(([x, y, r, op], i) => (
          <g key={`st${i}`}>
            <circle cx={x*s} cy={y*s} r={r*s} fill="#e2e8f0" opacity={op as number} />
            <circle cx={x*s} cy={y*s} r={r*4*s} fill="url(#s13-starG)" opacity={op as number} />
          </g>
        ))}

        <path d={`M 0 ${125*s} Q ${50*s} ${115*s} ${100*s} ${127*s} T ${185*s} ${121*s} T ${200*s} ${127*s} L ${200*s} ${155*s} L 0 ${155*s} Z`} fill="#22162a" opacity="0.8" />
        <path d={`M 0 ${135*s} Q ${60*s} ${127*s} ${120*s} ${137*s} T ${195*s} ${131*s} T ${200*s} ${135*s} L ${200*s} ${165*s} L 0 ${165*s} Z`} fill="#1a1022" opacity="0.9" />

        <path d={`M 0 ${150*s} Q ${65*s} ${144*s} ${130*s} ${152*s} T ${200*s} ${146*s} L ${200*s} ${260*s} L 0 ${260*s} Z`} fill="url(#s13-ground)" />
        <path d={`M 0 ${175*s} Q ${90*s} ${169*s} ${200*s} ${177*s} L ${200*s} ${260*s} L 0 ${260*s} Z`} fill="url(#s13-soilA)" />
      </g>

      <g id="trunk" style={{ transformOrigin: `${100*s}px ${175*s}px` }}>
        <path d={`M ${100*s} ${175*s} C ${80*s} ${120*s} ${120*s} ${70*s} ${100*s} ${0*s}`} stroke="url(#s13-trunk)" strokeWidth={40*s} fill="none" strokeLinecap="round" />
        <path d={`M ${80*s} ${175*s} C ${60*s} ${120*s} ${100*s} ${70*s} ${80*s} ${0*s}`} stroke="#22142a" strokeWidth={5*s} fill="none" strokeLinecap="round" opacity="0.4" />
        <path d={`M ${120*s} ${175*s} C ${100*s} ${120*s} ${140*s} ${70*s} ${120*s} ${0*s}`} stroke="#060208" strokeWidth={8*s} fill="none" strokeLinecap="round" opacity="0.7" />
        <path d={`M ${95*s} ${175*s} C ${75*s} ${120*s} ${115*s} ${70*s} ${95*s} ${0*s}`} stroke="#b382e6" strokeWidth={1*s} fill="none" strokeLinecap="round" opacity="0.5" />
      </g>

      <g id="roots" style={{ transformOrigin: `${100*s}px ${175*s}px` }}>
        <path d={`M ${85*s} ${160*s} Q ${40*s} ${170*s} ${25*s} ${185*s}`} stroke="url(#s13-trunk)" strokeWidth={12*s} fill="none" strokeLinecap="round" />
        <path d={`M ${115*s} ${165*s} Q ${160*s} ${170*s} ${180*s} ${185*s}`} stroke="url(#s13-trunk)" strokeWidth={14*s} fill="none" strokeLinecap="round" />
        <path d={`M ${100*s} ${168*s} Q ${85*s} ${190*s} ${110*s} ${220*s}`} stroke="url(#s13-trunk)" strokeWidth={10*s} fill="none" strokeLinecap="round" />
        <path d={`M ${125*s} ${160*s} Q ${180*s} ${160*s} ${200*s} ${175*s}`} stroke="url(#s13-trunk)" strokeWidth={8*s} fill="none" strokeLinecap="round" />
        <path d={`M ${75*s} ${165*s} Q ${20*s} ${160*s} ${5*s} ${170*s}`} stroke="url(#s13-trunk)" strokeWidth={7*s} fill="none" strokeLinecap="round" />
      </g>

      <g id="canopy-massive" style={{ transformOrigin: `${100*s}px ${50*s}px` }}>
        {canopyClusters.map(([x,y,r], i) => (
          <g key={i}>
            <circle cx={x*s} cy={y*s} r={r*s} fill="url(#s13-canopyShadow)" />
            <circle cx={(x-r*0.1)*s} cy={(y-r*0.1)*s} r={r*0.85*s} fill="url(#s13-canopyBase)" />
            <circle cx={(x-r*0.2)*s} cy={(y-r*0.25)*s} r={r*0.6*s} fill="url(#s13-canopyHighlight)" />
            <path d={`M ${(x-r*0.6)*s} ${(y-r*0.4)*s} Q ${x*s} ${(y-r*0.9)*s} ${(x+r*0.4)*s} ${(y-r*0.6)*s}`} stroke="url(#s13-canopyRim)" strokeWidth={r*0.1*s} strokeLinecap="round" fill="none" opacity="0.9" />
          </g>
        ))}
      </g>

      <g id="magic-flora">
        {glowingLotuses.map(([x, y, r, rot], i) => (
          <g key={`ml${i}`} transform={`translate(${x*s}, ${y*s}) rotate(${rot}) scale(${r})`}>
            <path d={`M 0 0 C -2 ${-10*s} -8 ${-15*s} 0 ${-20*s} C 8 ${-15*s} 2 ${-10*s} 0 0 Z`} fill="#82e6d9" opacity="0.9" />
            <path d={`M 0 0 C -5 ${-5*s} -12 ${-8*s} -10 ${-12*s} C -5 ${-10*s} -2 ${-5*s} 0 0 Z`} fill="#82e6d9" opacity="0.7" />
            <path d={`M 0 0 C 5 ${-5*s} 12 ${-8*s} 10 ${-12*s} C 5 ${-10*s} 2 ${-5*s} 0 0 Z`} fill="#82e6d9" opacity="0.7" />
            <circle cx={0} cy={-10*s} r={15*s} fill="url(#s13-magicGlow)" />
            <path d={`M 0 0 Q 0 ${-20*s} 0 ${-40*s}`} stroke="#4a8c99" strokeWidth={0.5*s} fill="none" opacity="0.5" />
          </g>
        ))}
      </g>

      <g id="spirits">
        <path d={`M ${110*s} ${170*s} Q ${112*s} ${165*s} ${115*s} ${168*s} Q ${113*s} ${172*s} ${110*s} ${170*s} Z`} fill="#e2e8f0" opacity="0.9" />
        <circle cx={112*s} cy={167*s} r={0.5*s} fill="#1a1022" />
        <circle cx={114*s} cy={167.5*s} r={0.5*s} fill="#1a1022" />
        <circle cx={112.5*s} cy={168.5*s} r={6*s} fill="url(#s13-starG)" />

        <path d={`M ${85*s} ${175*s} Q ${83*s} ${170*s} ${80*s} ${173*s} Q ${82*s} ${177*s} ${85*s} ${175*s} Z`} fill="#e2e8f0" opacity="0.9" />
        <circle cx={83*s} cy={172*s} r={0.4*s} fill="#1a1022" />
        <circle cx={81*s} cy={172.5*s} r={0.4*s} fill="#1a1022" />
        <circle cx={82.5*s} cy={173.5*s} r={5*s} fill="url(#s13-starG)" />
      </g>

      <g id="glow">
        {motes.map(([x, y, r, op], i) => (
          <g key={`gm${i}`}>
            <circle cx={x*s} cy={y*s} r={r*4*s} fill="#82e6d9" opacity={(op as number) * 0.4} />
            <circle cx={x*s} cy={y*s} r={r*1.5*s} fill="#ffffff" opacity={op as number} />
          </g>
        ))}
      </g>
    </svg>
  );
}
