'use client';

import { useState } from 'react';

import { AuthFooter } from '@/app/features/auth/components/AuthFooter/AuthFooter';
import { AuthForm } from '@/app/features/auth/components/AuthForm/AuthForm';
import { AuthHeader } from '@/app/features/auth/components/AuthHeader/AuthHeader';
import { AuthTabs } from '@/app/features/auth/components/AuthTabs/AuthTabs';
import { AUTH_MODES } from '@/app/features/auth/constant';
import type { AuthMode } from '@/app/features/auth/models/auth.models';

import styles from './AuthPage.module.css';

export function AuthPage() {
  const [mode, setMode] = useState<AuthMode>(AUTH_MODES.login);

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <AuthHeader />
        <AuthTabs mode={mode} onModeChange={setMode} />
        <AuthForm key={mode} mode={mode} />
        <AuthFooter mode={mode} onModeChange={setMode} />
      </div>
    </div>
  );
}
