'use client';

import type { ButtonHTMLAttributes } from 'react';

import styles from './Button.module.css';

export const BUTTON_VARIANTS = {
  accent: 'accent',
  outline: 'outline',
  ghost: 'ghost',
  icon: 'icon',
  text: 'text',
  overlay: 'overlay',
  danger: 'danger',
} as const;

export type ButtonVariant = (typeof BUTTON_VARIANTS)[keyof typeof BUTTON_VARIANTS];

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

// Values are `string | undefined` because Next types a CSS module as an index
// signature; the lookup is filtered for falsy below, so a missing class degrades
// to "no modifier" rather than the literal "undefined" in the class list.
const VARIANT_CLASS: Record<ButtonVariant, string | undefined> = {
  [BUTTON_VARIANTS.accent]: styles.accent,
  [BUTTON_VARIANTS.outline]: styles.outline,
  [BUTTON_VARIANTS.ghost]: styles.ghost,
  [BUTTON_VARIANTS.icon]: styles.icon,
  [BUTTON_VARIANTS.text]: styles.text,
  [BUTTON_VARIANTS.overlay]: styles.overlay,
  [BUTTON_VARIANTS.danger]: styles.danger,
};

export function Button({
  variant = BUTTON_VARIANTS.accent,
  type = 'button',
  className,
  ...props
}: ButtonProps) {
  const classes = [styles.button, VARIANT_CLASS[variant], className].filter(Boolean).join(' ');
  return <button type={type} className={classes} {...props} />;
}
