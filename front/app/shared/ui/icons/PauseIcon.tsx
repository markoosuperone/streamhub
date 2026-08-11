type PauseIconProps = {
  size?: number;
};

export function PauseIcon({ size = 16 }: PauseIconProps) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} aria-hidden>
      <rect x="3" y="2" width="3.5" height="12" rx="1" fill="currentColor" />
      <rect x="9.5" y="2" width="3.5" height="12" rx="1" fill="currentColor" />
    </svg>
  );
}
