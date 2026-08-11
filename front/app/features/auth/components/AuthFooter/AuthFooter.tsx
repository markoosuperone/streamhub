import { AUTH_MODES } from '@/app/features/auth/constant';
import type { AuthMode } from '@/app/features/auth/models/auth.models';
import { Button, BUTTON_VARIANTS } from '@/app/shared/ui/Button/Button';

import styles from './AuthFooter.module.css';

type AuthFooterProps = {
  mode: AuthMode;
  onModeChange: (mode: AuthMode) => void;
};

const LOGIN_PROMPT_LABEL = 'New here?';
const LOGIN_PROMPT_ACTION_LABEL = 'Create an account';
const REGISTER_PROMPT_LABEL = 'Already have an account?';
const REGISTER_PROMPT_ACTION_LABEL = 'Log in';

export function AuthFooter({ mode, onModeChange }: AuthFooterProps) {
  const isLogin = mode === AUTH_MODES.login;
  const handleSwitchToRegister = () => onModeChange(AUTH_MODES.register);
  const handleSwitchToLogin = () => onModeChange(AUTH_MODES.login);

  return (
    <div className={styles.footer}>
      {isLogin ? (
        <span className={styles.prompt}>
          {LOGIN_PROMPT_LABEL}
          <Button
            variant={BUTTON_VARIANTS.text}
            className={styles.footerLink}
            onClick={handleSwitchToRegister}
          >
            {LOGIN_PROMPT_ACTION_LABEL}
          </Button>
        </span>
      ) : (
        <span className={styles.prompt}>
          {REGISTER_PROMPT_LABEL}
          <Button
            variant={BUTTON_VARIANTS.text}
            className={styles.footerLink}
            onClick={handleSwitchToLogin}
          >
            {REGISTER_PROMPT_ACTION_LABEL}
          </Button>
        </span>
      )}
    </div>
  );
}
