'use client';

import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';

import { Button, BUTTON_VARIANTS } from '@/app/shared/ui/Button/Button';

import styles from './Modal.module.css';

type ModalProps = {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
};

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Modal({ title, onClose, children }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  // Per-instance, so two dialogs on screen at once can't both claim the same
  // DOM id and leave aria-labelledby pointing at the wrong heading.
  const titleId = useId();

  // `aria-modal="true"` tells assistive tech that everything outside is inert.
  // Nothing enforces that on its own, so the dialog has to take focus, keep
  // Tab inside itself, and hand focus back on close — otherwise the attribute
  // hides the page from a screen reader while the keyboard can still reach it.
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    const firstFocusable = panel?.querySelector<HTMLElement>(FOCUSABLE);
    // Falls back to the panel itself (tabIndex={-1}) when it holds nothing
    // focusable, so focus still enters the dialog rather than staying behind it.
    if (firstFocusable) {
      firstFocusable.focus();
    } else {
      panel?.focus();
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !panel) return;

      const focusable = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) {
        event.preventDefault();
        return;
      }

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previouslyFocused?.focus();
    };
  }, [onClose]);

  return createPortal(
    <div className={styles.overlay} onClick={onClose}>
      <div
        ref={panelRef}
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.header}>
          <h2 id={titleId} className={styles.title}>
            {title}
          </h2>
          <Button
            variant={BUTTON_VARIANTS.icon}
            className={styles.close}
            aria-label="Close"
            onClick={onClose}
          >
            ✕
          </Button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}
