'use client';

import { useEffect } from 'react';

import { Button, BUTTON_VARIANTS } from '@/app/shared/ui/Button/Button';
import { Heading } from '@/app/shared/ui/Heading/Heading';

import styles from './ErrorFallback.module.css';

type ErrorFallbackProps = {
  error: Error;
  onRetry: () => void;
  title?: string;
  message?: string;
};

const DEFAULT_TITLE = 'Something went wrong';
const DEFAULT_MESSAGE = 'An unexpected error occurred. Try again, or come back in a moment.';

export function ErrorFallback({
  error,
  onRetry,
  title = DEFAULT_TITLE,
  message = DEFAULT_MESSAGE,
}: ErrorFallbackProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className={styles.card}>
      <div className={styles.text}>
        <Heading>{title}</Heading>
        <p className={styles.subtitle}>{message}</p>
      </div>
      <Button variant={BUTTON_VARIANTS.accent} onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}
