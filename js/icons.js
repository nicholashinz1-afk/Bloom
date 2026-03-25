// Bloom icons — SVG generators
function bloomIcon(size = 24) {
  // Four teardrop petals in 2x2 grid — sage, rose, sky, amber
  // Replicates the clean original icon style
  const s = size;
  return `<svg width="${s}" height="${s}" viewBox="0 0 100 100" style="display:inline-block;vertical-align:middle;flex-shrink:0" xmlns="http://www.w3.org/2000/svg">
    <circle cx="35" cy="35" r="18" fill="#7a9e7e" opacity="0.9"/>
    <circle cx="35" cy="35" r="10" fill="#a8c5ab"/>
    <circle cx="65" cy="35" r="18" fill="#b07878" opacity="0.9"/>
    <circle cx="65" cy="35" r="10" fill="#d4a8a8"/>
    <circle cx="35" cy="65" r="18" fill="#6a9ab0" opacity="0.9"/>
    <circle cx="35" cy="65" r="10" fill="#9ec4d8"/>
    <circle cx="65" cy="65" r="18" fill="#c9954a" opacity="0.9"/>
    <circle cx="65" cy="65" r="10" fill="#e0b87a"/>
  </svg>`;
}

function buddyIcon(size = 24) {
  const s = size;
  return `<svg width="${s}" height="${s}" viewBox="0 0 100 100" style="display:inline-block;vertical-align:middle;flex-shrink:0" xmlns="http://www.w3.org/2000/svg">
    <circle cx="36" cy="50" r="28" fill="#7a9e7e" opacity="0.9"/>
    <circle cx="36" cy="50" r="16" fill="#a8c5ab"/>
    <circle cx="64" cy="50" r="28" fill="#c9954a" opacity="0.9"/>
    <circle cx="64" cy="50" r="16" fill="#e0b87a"/>
  </svg>`;
}

export { bloomIcon, buddyIcon };
