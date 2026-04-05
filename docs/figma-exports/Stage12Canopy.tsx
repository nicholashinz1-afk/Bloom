export function Stage12Canopy({ viewBox = "200 260" }: { viewBox?: string }) {
  const [w, h] = viewBox.split(' ').map(Number);
  const s = w / 200;

  const grassTufts = [
    [5, 148, 6, -2], [25, 147, 5, 2], [50, 149, 7, -3],
    [80, 148, 6, 2], [110, 150, 5, -1], [140, 149, 7, 3],
    [160, 148, 6, -2], [180, 147, 5, 1], [195, 148, 6, 2]
  ];

  const motes = [
    [30, 150, 1.2, 0.5], [60, 120, 0.8, 0.7], [80, 135, 1.5, 0.4],
    [120, 145, 1.0, 0.6], [170, 160, 1.4, 0.4], [140, 115, 0.9, 0.6],
    [20, 130, 1.0, 0.5], [180, 135, 1.2, 0.5], [100, 120, 0.8, 0.7]
  ];

  const canopyClusters = [
    [100, -20, 120], [20, -10, 100], [180, -10, 100],
    [-20, 30, 80], [220, 30, 80], [60, 40, 70],
    [140, 40, 70], [100, 60, 80], [10, 80, 60],
    [190, 80, 60], [40, 100, 50], [160, 100, 50]
  ];

  return (
    <svg viewBox={`0 0 ${w} ${h}`} xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <defs>
        <linearGradient id="s12-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#261a42" />
          <stop offset="40%" stopColor="#6e2a4a" />
          <stop offset="100%" stopColor="#d95c4e" />
        </linearGradient>
        <radialGradient id="s12-sunGlow" cx="50%" cy="80%" r="50%">
          <stop offset="0%" stopColor="#ffb885" stopOpacity="0.8" />
          <stop offset="50%" stopColor="#d95c4e" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#6e2a4a" stopOpacity="0" />
        </radialGradient>

        <linearGradient id="s12-ground" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#382a22" />
          <stop offset="100%" stopColor="#1c1214" />
        </linearGradient>
        <linearGradient id="s12-soilA" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#221216" />
          <stop offset="100%" stopColor="#0c0608" />
        </linearGradient>

        <linearGradient id="s12-trunk" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#181014" />
          <stop offset="50%" stopColor="#2a181e" />
          <stop offset="100%" stopColor="#3c2226" />
        </linearGradient>

        <radialGradient id="s12-canopyShadow" cx="50%" cy="60%" r="50%">
          <stop offset="0%" stopColor="#120c18" />
          <stop offset="100%" stopColor="#0a040c" />
        </radialGradient>
        <radialGradient id="s12-canopyBase" cx="40%" cy="30%" r="60%">
          <stop offset="0%" stopColor="#3a1c2a" />
          <stop offset="100%" stopColor="#1c0c18" />
        </radialGradient>
        <radialGradient id="s12-canopyHighlight" cx="30%" cy="30%" r="50%">
          <stop offset="0%" stopColor="#6e2a4a" />
          <stop offset="100%" stopColor="#3a1c2a" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="s12-canopyRim" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffb885" />
          <stop offset="100%" stopColor="#6e2a4a" stopOpacity="0" />
        </linearGradient>
      </defs>

      <g id="bg-static">
        <rect width={w} height={h} fill="url(#s12-sky)" />
        <rect width={w} height={h} fill="url(#s12-sunGlow)" />

        <g id="clouds" opacity="0.7">
          <path d={`M ${10*s} ${60*s} Q ${30*s} ${50*s} ${60*s} ${55*s} T ${120*s} ${52*s} L ${120*s} ${75*s} L ${10*s} ${75*s} Z`} fill="#5e263d" opacity="0.6" />
          <path d={`M ${140*s} ${55*s} Q ${160*s} ${45*s} ${180*s} ${50*s} T ${220*s} ${48*s} L ${220*s} ${65*s} L ${140*s} ${65*s} Z`} fill="#5e263d" opacity="0.5" />
          <path d={`M ${10*s} ${75*s} L ${120*s} ${75*s}`} stroke="#d95c4e" strokeWidth={1*s} strokeLinecap="round" opacity="0.7" />
        </g>

        <path d={`M 0 ${125*s} Q ${50*s} ${115*s} ${100*s} ${127*s} T ${185*s} ${121*s} T ${200*s} ${127*s} L ${200*s} ${155*s} L 0 ${155*s} Z`} fill="#4c2e36" opacity="0.8" />
        <path d={`M 0 ${135*s} Q ${60*s} ${127*s} ${120*s} ${137*s} T ${195*s} ${131*s} T ${200*s} ${135*s} L ${200*s} ${165*s} L 0 ${165*s} Z`} fill="#3a2228" opacity="0.9" />

        <path d={`M 0 ${150*s} Q ${65*s} ${144*s} ${130*s} ${152*s} T ${200*s} ${146*s} L ${200*s} ${260*s} L 0 ${260*s} Z`} fill="url(#s12-ground)" />
        <path d={`M 0 ${175*s} Q ${90*s} ${169*s} ${200*s} ${177*s} L ${200*s} ${260*s} L 0 ${260*s} Z`} fill="url(#s12-soilA)" />

        {grassTufts.map(([x, y, h, c], i) => (
          <path key={`gt${i}`} d={`M ${x*s} ${y*s} Q ${(x+c/2)*s} ${(y-h/2)*s} ${(x+c)*s} ${(y-h)*s}`} stroke="#1c1214" strokeWidth={0.8*s} fill="none" strokeLinecap="round" />
        ))}
      </g>

      <g id="trunk" style={{ transformOrigin: `${100*s}px ${175*s}px` }}>
        <path d={`M ${100*s} ${175*s} C ${85*s} ${120*s} ${115*s} ${70*s} ${100*s} ${0*s}`} stroke="url(#s12-trunk)" strokeWidth={35*s} fill="none" strokeLinecap="round" />
        <path d={`M ${85*s} ${175*s} C ${70*s} ${120*s} ${100*s} ${70*s} ${85*s} ${0*s}`} stroke="#3c2226" strokeWidth={4*s} fill="none" strokeLinecap="round" opacity="0.4" />
        <path d={`M ${115*s} ${175*s} C ${100*s} ${120*s} ${130*s} ${70*s} ${115*s} ${0*s}`} stroke="#0c0608" strokeWidth={6*s} fill="none" strokeLinecap="round" opacity="0.7" />
        <path d={`M ${95*s} ${175*s} C ${80*s} ${120*s} ${110*s} ${70*s} ${95*s} ${0*s}`} stroke="#2a181e" strokeWidth={3*s} fill="none" strokeLinecap="round" opacity="0.5" />
      </g>

      <g id="roots" style={{ transformOrigin: `${100*s}px ${175*s}px` }}>
        <path d={`M ${90*s} ${160*s} Q ${50*s} ${170*s} ${35*s} ${185*s}`} stroke="url(#s12-trunk)" strokeWidth={10*s} fill="none" strokeLinecap="round" />
        <path d={`M ${110*s} ${165*s} Q ${150*s} ${170*s} ${170*s} ${185*s}`} stroke="url(#s12-trunk)" strokeWidth={12*s} fill="none" strokeLinecap="round" />
        <path d={`M ${100*s} ${168*s} Q ${90*s} ${190*s} ${110*s} ${210*s}`} stroke="url(#s12-trunk)" strokeWidth={8*s} fill="none" strokeLinecap="round" />
        <path d={`M ${118*s} ${160*s} Q ${170*s} ${160*s} ${190*s} ${175*s}`} stroke="url(#s12-trunk)" strokeWidth={7*s} fill="none" strokeLinecap="round" />
        <path d={`M ${82*s} ${165*s} Q ${30*s} ${160*s} ${15*s} ${170*s}`} stroke="url(#s12-trunk)" strokeWidth={6*s} fill="none" strokeLinecap="round" />
      </g>

      <g id="canopy-massive" style={{ transformOrigin: `${100*s}px ${50*s}px` }}>
        {canopyClusters.map(([x,y,r], i) => (
          <g key={i}>
            <circle cx={x*s} cy={y*s} r={r*s} fill="url(#s12-canopyShadow)" />
            <circle cx={(x-r*0.1)*s} cy={(y-r*0.1)*s} r={r*0.85*s} fill="url(#s12-canopyBase)" />
            <circle cx={(x-r*0.2)*s} cy={(y-r*0.25)*s} r={r*0.6*s} fill="url(#s12-canopyHighlight)" />
            <path d={`M ${(x-r*0.6)*s} ${(y-r*0.4)*s} Q ${x*s} ${(y-r*0.9)*s} ${(x+r*0.4)*s} ${(y-r*0.6)*s}`} stroke="url(#s12-canopyRim)" strokeWidth={r*0.1*s} strokeLinecap="round" fill="none" opacity="0.9" />
          </g>
        ))}
      </g>

      <g id="glow">
        <path d={`M ${100*s} ${50*s} L ${20*s} ${150*s} L ${60*s} ${150*s} Z`} fill="#ffb885" opacity="0.08" />
        <path d={`M ${100*s} ${50*s} L ${140*s} ${150*s} L ${180*s} ${150*s} Z`} fill="#ffb885" opacity="0.06" />

        {motes.map(([x, y, r, op], i) => (
          <g key={`gm${i}`}>
            <circle cx={x*s} cy={y*s} r={r*3*s} fill="#ffb885" opacity={(op as number) * 0.4} />
            <circle cx={x*s} cy={y*s} r={r*1.2*s} fill="#ffffff" opacity={op as number} />
          </g>
        ))}
      </g>
    </svg>
  );
}
