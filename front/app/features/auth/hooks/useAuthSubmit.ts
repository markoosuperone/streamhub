'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { useUser } from '@/app/entities/user/model/UserContext';
import { AUTH_FIELD_NAMES, AUTH_MODES } from '@/app/features/auth/constant';
import type { AuthMode } from '@/app/features/auth/models/auth.models';
import { ApiError } from '@/app/shared/api/api.error';
import { AUTH_API } from '@/app/shared/api/auth.api';
import { ROUTES } from '@/app/shared/routes';

const FALLBACK_ERROR_MESSAGE = 'Something went wrong. Please try again.';

function getField(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === 'string' ? value : '';
}

export function useAuthSubmit(mode: AuthMode) {
  const router = useRouter();
  const { setUser } = useUser();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (formData: FormData) => {
    setLoading(true);
    setError(null);

    const body = {
      email: getField(formData, AUTH_FIELD_NAMES.email),
      password: getField(formData, AUTH_FIELD_NAMES.password),
    };

    try {
      const user =
        mode === AUTH_MODES.login ? await AUTH_API.login(body) : await AUTH_API.register(body);
      setUser(user);
      router.push(ROUTES.home);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : FALLBACK_ERROR_MESSAGE);
    } finally {
      setLoading(false);
    }
  };

  return { submit, loading, error };
}
