'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { Button, BUTTON_VARIANTS, type ButtonVariant } from '@/app/shared/ui/Button/Button';

import styles from './Menu.module.css';

type MenuProps = {
  trigger: React.ReactNode;
  triggerLabel: string;
  triggerVariant?: ButtonVariant;
  triggerClassName?: string;
  panelClassName?: string;
  children: (close: () => void) => React.ReactNode;
  /** Fires whenever the menu closes, from any source (item action, outside
   * click, Escape, scroll) — use it to reset transient panel-local state. */
  onClose?: () => void;
};

// Generic anchored dropdown: a trigger button plus a portaled panel (escapes
// any ancestor's `overflow: hidden`, e.g. a card clipping its rounded
// corners). Position is computed on open from the trigger's rect; the panel
// closes on outside click, Escape, or scroll rather than tracking live
// repositioning, which is simpler and enough for short-lived menus.
export function Menu({
  trigger,
  triggerLabel,
  triggerVariant = BUTTON_VARIANTS.icon,
  triggerClassName,
  panelClassName,
  children,
  onClose,
}: MenuProps) {
  const triggerElRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; right: number } | null>(null);

  const open = position !== null;

  const close = useCallback(() => {
    setPosition(null);
    onClose?.();
  }, [onClose]);

  const toggleOpen = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    triggerElRef.current = event.currentTarget;
    if (open) {
      close();
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    setPosition({ top: rect.bottom + 6, right: window.innerWidth - rect.right });
  };

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (panelRef.current?.contains(target) || triggerElRef.current?.contains(target)) return;
      close();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    // Closing on scroll is meant for the user scrolling the page/background
    // away from the (fixed-position) panel, not for a scroll caused by
    // interacting with the panel's own content — e.g. focusing or clicking
    // an element inside it that needs bringing into view. The latter would
    // otherwise close the menu (and whatever form is open inside it)
    // immediately after the interaction that triggered the scroll.
    const handleScroll = () => {
      if (panelRef.current?.contains(document.activeElement)) return;
      close();
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleScroll, true);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [open, close]);

  return (
    <>
      <Button
        variant={triggerVariant}
        className={triggerClassName}
        aria-label={triggerLabel}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={toggleOpen}
      >
        {trigger}
      </Button>

      {open &&
        createPortal(
          <div
            ref={panelRef}
            className={`${styles.panel} ${panelClassName ?? ''}`}
            style={{ top: position.top, right: position.right }}
            // Deliberately `dialog`, not `menu`: callers put arbitrary content
            // in here — buttons, a rename form — not a list of `menuitem`s,
            // and none of the arrow-key navigation the menu role implies is
            // implemented. Claiming `menu` would announce a menu with no items.
            role="dialog"
            aria-label={triggerLabel}
            onClick={(event) => event.stopPropagation()}
          >
            {children(close)}
          </div>,
          document.body,
        )}
    </>
  );
}
