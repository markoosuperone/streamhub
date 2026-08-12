import type { InputHTMLAttributes } from 'react';

import styles from './AuthField.module.css';

type AuthFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
};

export function AuthField({ label, id, ...inputProps }: AuthFieldProps) {
  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>
        {label}
      </label>
      <input id={id} className={styles.input} {...inputProps} />
    </div>
  );
}
