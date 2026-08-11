'use client';

import { useRouter } from 'next/navigation';

import { gradientFor } from '@/app/entities/media/lib/poster';
import { usePlayerStore } from '@/app/entities/player/model/usePlayerStore';
import { usePlaylistItemsStore } from '@/app/entities/playlist/model/usePlaylistItemsStore';
import { usePlaylistsStore } from '@/app/entities/playlist/model/usePlaylistsStore';
import { useUser } from '@/app/entities/user/model/UserContext';
import { AUTH_API } from '@/app/shared/api/auth.api';
import { ROUTES } from '@/app/shared/routes';
import { Button, BUTTON_VARIANTS } from '@/app/shared/ui/Button/Button';

import styles from './AccountMenu.module.css';

export function AccountMenu() {
  const router = useRouter();
  const { user, setUser } = useUser();
  const resetPlayer = usePlayerStore((state) => state.reset);
  const resetPlaylists = usePlaylistsStore((state) => state.reset);
  const resetPlaylistItems = usePlaylistItemsStore((state) => state.reset);

  const initials = user ? user.email.slice(0, 2).toUpperCase() : '··';

  // Sign-out clears every remaining piece of global state, not just the auth
  // user — otherwise a different user logging in on the same device/tab
  // would briefly see (or never refetch past) the previous session's
  // now-playing/queue and playlists. The media list itself needs no explicit
  // clear: it's local state owned by whichever useMediaListQuery instance is
  // mounted, which unmounts (and so resets) on navigating to /auth.
  const handleSignOut = async () => {
    try {
      await AUTH_API.logout();
    } finally {
      setUser(null);
      resetPlayer();
      resetPlaylists();
      resetPlaylistItems();
      router.push(ROUTES.auth);
    }
  };

  return (
    <div className={styles.account}>
      <span
        className={styles.avatar}
        style={{ backgroundImage: gradientFor(user?.user_id ?? 'anonymous') }}
      >
        {initials}
      </span>
      <Button variant={BUTTON_VARIANTS.text} className={styles.signOut} onClick={handleSignOut}>
        Sign out
      </Button>
    </div>
  );
}
