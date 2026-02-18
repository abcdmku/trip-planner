function hexLum(hex: string): number {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

export function blockColors(hex: string): { text: string; sub: string; handle: string } {
  const light = hexLum(hex) > 0.55;
  return {
    text: light ? 'rgba(0,0,0,0.85)' : '#fff',
    sub: light ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.65)',
    handle: light ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.35)',
  };
}
