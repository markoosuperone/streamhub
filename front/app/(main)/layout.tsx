import { UploadProvider } from '@/app/entities/media/model/UploadProvider';
import { PlayerRail } from '@/app/widgets/PlayerRail/PlayerRail';
import { PlayerRailBoundary } from '@/app/widgets/PlayerRail/PlayerRailBoundary';
import { TopBar } from '@/app/widgets/TopBar/TopBar';

import styles from './layout.module.css';

export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className={styles.shell}>
      <UploadProvider>
        <TopBar />
        <div className={styles.content}>
          <PlayerRailBoundary>
            <PlayerRail />
          </PlayerRailBoundary>
          {children}
        </div>
      </UploadProvider>
    </div>
  );
}
