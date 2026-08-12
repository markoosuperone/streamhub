import styles from './Skeleton.module.css';

type SkeletonProps = {
  /** Sizing lives with the caller — a skeleton only knows how to shimmer. */
  className?: string;
};

export function Skeleton({ className }: SkeletonProps) {
  const classes = [styles.skeleton, className].filter(Boolean).join(' ');
  return <span aria-hidden="true" className={classes} />;
}
