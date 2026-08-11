'use client';
import { createContext, PropsWithChildren, useContext, useMemo } from 'react';

import { UploadEvents } from './UploadEvents';

const UploadContext = createContext<UploadEvents | null>(null);

export function UploadProvider({ children }: PropsWithChildren) {
  const service = useMemo(() => new UploadEvents(), []);

  return <UploadContext value={service}>{children}</UploadContext>;
}

export function useUploadService() {
  const service = useContext(UploadContext);

  if (!service) {
    throw new Error('UploadProvider missing');
  }

  return service;
}
