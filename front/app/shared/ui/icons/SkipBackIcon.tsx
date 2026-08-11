type SkipBackIconProps = {
  size?: number;
};

export function SkipBackIcon({ size = 16 }: SkipBackIconProps) {
  return (
    <svg viewBox="0 0 18 14" width={size} height={(size * 14) / 18} aria-hidden>
      <rect x="1" y="1" width="2" height="12" rx="1" fill="currentColor" />
      <path d="M10.5 1 L4 7 L10.5 13 Z" fill="currentColor" />
      <path d="M17 1 L10.5 7 L17 13 Z" fill="currentColor" />
    </svg>
  );
}
