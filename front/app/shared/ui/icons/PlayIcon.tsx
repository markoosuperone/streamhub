type PlayIconProps = {
  size?: number;
};

export function PlayIcon({ size = 16 }: PlayIconProps) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} aria-hidden>
      <path d="M4 1.8 L13.5 8 L4 14.2 Z" fill="currentColor" />
    </svg>
  );
}
