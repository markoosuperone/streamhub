import { UploadEvent } from './types';

export class UploadEvents {
  private listeners = new Set<(event: UploadEvent) => void>();

  subscribe(listener: (event: UploadEvent) => void) {
    this.listeners.add(listener);
  }
  unsubscribe(listener: (event: UploadEvent) => void) {
    this.listeners.delete(listener);
  }

  private emit(event: UploadEvent) {
    this.listeners.forEach((listener) => listener(event));
  }

  uploadStarted(file: File) {
    this.emit({ type: 'started', file });
  }

  uploadProgress(progress: number) {
    this.emit({ type: 'progress', progress });
  }

  uploadCompleted() {
    this.emit({ type: 'completed' });
  }

  uploadFailed(error: Error) {
    this.emit({ type: 'failed', error });
  }
}
