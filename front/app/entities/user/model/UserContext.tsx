'use client';

import type { UserDTO } from '@superplayer/contracts';
import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from 'react';

import { USERS_API } from '@/app/shared/api/users.api';

type UserContextValue = {
  user: UserDTO | null;
  loading: boolean;
  setUser: (user: UserDTO | null) => void;
};

const UserContext = createContext<UserContextValue | null>(null);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserDTO | null>(null);
  const [loading, setLoading] = useState(true);

  // Hydrate on mount: auth cookies are httpOnly, so the only way to know who
  // is logged in after a reload is to ask the backend.
  useEffect(() => {
    let cancelled = false;

    USERS_API.me()
      .then((me) => {
        if (!cancelled) setUser(me);
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo(() => ({ user, loading, setUser }), [user, loading, setUser]);

  return <UserContext value={value}>{children}</UserContext>;
}

export function useUser(): UserContextValue {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
