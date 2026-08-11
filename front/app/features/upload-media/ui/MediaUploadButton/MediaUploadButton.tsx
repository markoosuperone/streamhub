'use client';

import { useRef, useState } from 'react';

import { useUploadService } from '@/app/entities/media/model/UploadProvider';
import { MEDIA_API } from '@/app/shared/api/media.api';
import { Button } from '@/app/shared/ui/Button/Button';

import styles from './MediaUploadButton.module.css';

export function MediaUploadButton() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadService = useUploadService();
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      await MEDIA_API.upload(file);
    } catch (error: unknown) {
      uploadService.uploadFailed(
        error instanceof Error ? error : new Error('Unknown upload error'),
      );
      // Upload errors surface as the list simply not changing; a toast system
      // can take over here later.
    } finally {
      setUploading(false);
      uploadService.uploadCompleted();
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*,video/*"
        className={styles.fileInput}
        onChange={(event) => handleUpload(event.target.files?.[0])}
      />
      <Button
        className={styles.upload}
        disabled={uploading}
        onClick={() => fileInputRef.current?.click()}
      >
        {uploading ? 'Uploading…' : '↥ Upload'}
      </Button>
    </>
  );
}
