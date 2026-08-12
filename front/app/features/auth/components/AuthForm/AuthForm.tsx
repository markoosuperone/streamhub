import { AuthField } from '@/app/features/auth/components/AuthField/AuthField';
import { useAuthSubmit } from '@/app/features/auth/hooks/useAuthSubmit';
import type { AuthMode } from '@/app/features/auth/models/auth.models';
import { Button, BUTTON_VARIANTS } from '@/app/shared/ui/Button/Button';

import { AUTH_FIELD_NAMES, AUTH_MODES } from '../../constant';
import styles from './AuthForm.module.css';

type AuthFormProps = {
  mode: AuthMode;
};

const EMAIL_FIELD = {
  id: AUTH_FIELD_NAMES.email,
  name: AUTH_FIELD_NAMES.email,
  label: 'Email',
  placeholder: 'you@example.com',
};

const PASSWORD_FIELD = {
  id: AUTH_FIELD_NAMES.password,
  name: AUTH_FIELD_NAMES.password,
  label: 'Password',
  placeholder: '••••••••',
};

const FORGOT_PASSWORD_LABEL = 'Forgot password?';
const PENDING_LABEL = 'Please wait…';

const SUBMIT_LABELS: Record<AuthMode, string> = {
  [AUTH_MODES.login]: 'Log in',
  [AUTH_MODES.register]: 'Create account',
};

export function AuthForm({ mode }: AuthFormProps) {
  const isLogin = mode === AUTH_MODES.login;
  const { submit, loading, error } = useAuthSubmit(mode);
  const passwordAutoComplete = isLogin ? 'current-password' : 'new-password';
  const submitLabel = loading ? PENDING_LABEL : SUBMIT_LABELS[mode];

  const handleSubmit = (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    void submit(new FormData(event.currentTarget));
  };

  return (
    <form className={styles.card} onSubmit={handleSubmit}>
      <input type="hidden" name={AUTH_FIELD_NAMES.mode} value={mode} />

      <AuthField
        id={EMAIL_FIELD.id}
        name={EMAIL_FIELD.name}
        type="email"
        label={EMAIL_FIELD.label}
        placeholder={EMAIL_FIELD.placeholder}
        autoComplete="email"
        required
      />

      <AuthField
        id={PASSWORD_FIELD.id}
        name={PASSWORD_FIELD.name}
        type="password"
        label={PASSWORD_FIELD.label}
        placeholder={PASSWORD_FIELD.placeholder}
        autoComplete={passwordAutoComplete}
        minLength={8}
        required
      />

      <div className={styles.forgotRow}>
        {isLogin && (
          <Button variant={BUTTON_VARIANTS.text} className={styles.forgotLink}>
            {FORGOT_PASSWORD_LABEL}
          </Button>
        )}
      </div>

      <p className={styles.error} data-visible={Boolean(error)} role="alert">
        {error}
      </p>

      <div className={styles.submitWrap}>
        <Button type="submit" className={styles.submit} disabled={loading}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
