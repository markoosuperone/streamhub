import type { AuthMode } from '@/app/features/auth/models/auth.models';
import { Button, BUTTON_VARIANTS, type ButtonVariant } from '@/app/shared/ui/Button/Button';

import { AUTH_BUTTONS_IDS, AUTH_MODES } from '../../constant';
import styles from './AuthTabs.module.css';

type AuthTabsProps = {
  mode: AuthMode;
  onModeChange: (mode: AuthMode) => void;
};

const LOGIN_TAB_LABEL = 'Log in';
const REGISTER_TAB_LABEL = 'Register';

function getTabVariant(mode: AuthMode, tabMode: AuthMode): ButtonVariant {
  return mode === tabMode ? BUTTON_VARIANTS.accent : BUTTON_VARIANTS.ghost;
}

export function AuthTabs({ mode, onModeChange }: AuthTabsProps) {
  const isLogin = mode === AUTH_MODES.login;

  const handleTabClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    const nextMode =
      event.currentTarget.id === AUTH_BUTTONS_IDS.login ? AUTH_MODES.login : AUTH_MODES.register;
    onModeChange(nextMode);
  };

  return (
    <div className={styles.tabs} role="tablist">
      <Button
        role="tab"
        aria-selected={isLogin}
        id={AUTH_BUTTONS_IDS.login}
        variant={getTabVariant(mode, AUTH_MODES.login)}
        className={styles.tab}
        onClick={handleTabClick}
      >
        {LOGIN_TAB_LABEL}
      </Button>
      <Button
        role="tab"
        aria-selected={!isLogin}
        id={AUTH_BUTTONS_IDS.register}
        variant={getTabVariant(mode, AUTH_MODES.register)}
        className={styles.tab}
        onClick={handleTabClick}
      >
        {REGISTER_TAB_LABEL}
      </Button>
    </div>
  );
}
