type PlusIconProps = {
  size?: number;
};

export function PlusIcon({ size = 10 }: PlusIconProps) {
  return (
    <svg viewBox="0 0 14 14" width={size} height={size} aria-hidden>
      <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}
