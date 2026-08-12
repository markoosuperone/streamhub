type MoreIconProps = {
  size?: number;
};

export function MoreIcon({ size = 12 }: MoreIconProps) {
  return (
    <svg viewBox="0 0 4 14" width={size * (4 / 14)} height={size} aria-hidden>
      <circle cx="2" cy="2" r="2" fill="currentColor" />
      <circle cx="2" cy="7" r="2" fill="currentColor" />
      <circle cx="2" cy="12" r="2" fill="currentColor" />
    </svg>
  );
}
