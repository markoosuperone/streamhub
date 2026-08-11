type SkipForwardIconProps = {
  size?: number;
};

export function SkipForwardIcon({ size = 16 }: SkipForwardIconProps) {
  return (
    <svg viewBox="0 0 18 14" width={size} height={(size * 14) / 18} aria-hidden>
      <rect x="15" y="1" width="2" height="12" rx="1" fill="currentColor" />
      <path d="M7.5 1 L14 7 L7.5 13 Z" fill="currentColor" />
      <path d="M1 1 L7.5 7 L1 13 Z" fill="currentColor" />
    </svg>
  );
}
