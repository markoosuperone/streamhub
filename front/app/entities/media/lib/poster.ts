// Gradient pairs from the Figma poster designs (135deg, dark second stop).
const GRADIENTS = [
  ['rgb(108, 85, 148)', 'rgb(26, 27, 59)'],
  ['rgb(132, 61, 51)', 'rgb(46, 16, 17)'],
  ['rgb(0, 106, 132)', 'rgb(0, 29, 47)'],
  ['rgb(57, 114, 71)', 'rgb(0, 33, 18)'],
  ['rgb(160, 96, 36)', 'rgb(56, 23, 3)'],
  ['rgb(115, 61, 98)', 'rgb(34, 12, 33)'],
  ['rgb(0, 102, 98)', 'rgb(0, 30, 31)'],
  ['rgb(113, 100, 11)', 'rgb(30, 31, 0)'],
  ['rgb(58, 73, 126)', 'rgb(8, 21, 44)'],
  ['rgb(137, 64, 78)', 'rgb(45, 15, 26)'],
] as const;

// Deterministic per track so the color survives reloads and re-renders.
export function gradientFor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0;
  }
  const [from, to] = GRADIENTS[Math.abs(hash) % GRADIENTS.length] ?? GRADIENTS[0];
  return `linear-gradient(135deg, ${from} 0%, ${to} 100%)`;
}

export function formatDuration(totalSeconds: number): string {
  const whole = Math.floor(totalSeconds);
  const minutes = Math.floor(whole / 60);
  const seconds = (whole % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}
