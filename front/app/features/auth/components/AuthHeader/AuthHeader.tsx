import styles from './AuthHeader.module.css';

const LOGO_INITIAL = 'S';
const TITLE = 'Super Player';
const SUBTITLE = 'Upload, stream and playlist audio and video — all in one place.';

export function AuthHeader() {
  return (
    <div className={styles.header}>
      <div className={styles.logo}>{LOGO_INITIAL}</div>
      <div className={styles.title}>{TITLE}</div>
      <p className={styles.subtitle}>{SUBTITLE}</p>
    </div>
  );
}
