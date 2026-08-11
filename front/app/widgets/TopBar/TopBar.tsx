import { MediaSearchInput } from '@/app/features/media/components/MediaSearchInput/MediaSearchInput';
import { MediaUploadButton } from '@/app/features/upload-media/ui/MediaUploadButton/MediaUploadButton';
import { AccountMenu } from '@/app/features/users/components/AccountMenu/AccountMenu';
import { Brand } from '@/app/shared/ui/Brand/Brand';

import { NavLinks } from './NavLinks';
import styles from './TopBar.module.css';

export function TopBar() {
  return (
    <header className={styles.bar}>
      <Brand logo="S" name="Super Player" />

      <NavLinks />
      <MediaSearchInput />
      <MediaUploadButton />
      <AccountMenu />
    </header>
  );
}
