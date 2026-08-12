'use client';

import type { MediaResponseDTO } from '@superplayer/contracts';
import { useState } from 'react';

import { ApiError } from '@/app/shared/api/api.error';
import { MEDIA_API } from '@/app/shared/api/media.api';
import { Button, BUTTON_VARIANTS, type ButtonVariant } from '@/app/shared/ui/Button/Button';
import { MoreIcon } from '@/app/shared/ui/icons/MoreIcon';
import { Menu } from '@/app/shared/ui/Menu/Menu';
import { MenuConfirmDelete } from '@/app/shared/ui/Menu/MenuConfirmDelete';

import styles from './MediaCardMenu.module.css';

export const MEDIA_CARD_MENU_LAYOUTS = {
  corner: 'corner',
  row: 'row',
} as const;

export type MediaCardMenuLayout =
  (typeof MEDIA_CARD_MENU_LAYOUTS)[keyof typeof MEDIA_CARD_MENU_LAYOUTS];

const TRIGGER_VARIANT: Record<MediaCardMenuLayout, ButtonVariant> = {
  [MEDIA_CARD_MENU_LAYOUTS.corner]: BUTTON_VARIANTS.overlay,
  [MEDIA_CARD_MENU_LAYOUTS.row]: BUTTON_VARIANTS.icon,
};

const TRIGGER_CLASS: Record<MediaCardMenuLayout, string | undefined> = {
  [MEDIA_CARD_MENU_LAYOUTS.corner]: styles.trigger,
  [MEDIA_CARD_MENU_LAYOUTS.row]: styles.triggerRow,
};

type MediaCardMenuProps = {
  media: MediaResponseDTO;
  onDeleted: (mediaId: string) => void;
  // corner (default): absolutely positioned dark pill on top of a card's
  // poster artwork. row: sized like a normal inline row action (Library's
  // dense uploads list) — same trigger/confirm-delete logic either way.
  layout?: MediaCardMenuLayout;
};

const FALLBACK_ERROR_MESSAGE = 'Could not delete. Try again.';

export function MediaCardMenu({
  media,
  onDeleted,
  layout = MEDIA_CARD_MENU_LAYOUTS.corner,
}: MediaCardMenuProps) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async (close: () => void) => {
    setDeleting(true);
    setError(null);
    try {
      await MEDIA_API.delete(media.id);
      onDeleted(media.id);
      close();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : FALLBACK_ERROR_MESSAGE);
      setDeleting(false);
    }
  };

  return (
    <Menu
      trigger={<MoreIcon />}
      triggerLabel="More options"
      triggerVariant={TRIGGER_VARIANT[layout]}
      triggerClassName={TRIGGER_CLASS[layout]}
      onClose={() => {
        setConfirming(false);
        setError(null);
      }}
    >
      {(close) =>
        confirming ? (
          <MenuConfirmDelete
            label={media.title}
            submitting={deleting}
            error={error}
            onCancel={() => setConfirming(false)}
            onConfirm={() => handleDelete(close)}
          />
        ) : (
          <Button
            variant={BUTTON_VARIANTS.text}
            className={styles.deleteItem}
            onClick={() => setConfirming(true)}
          >
            Delete
          </Button>
        )
      }
    </Menu>
  );
}
