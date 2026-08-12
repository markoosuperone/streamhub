export type UploadEvent =
  | {
      type: 'started';
      file: File;
    }
  | {
      type: 'progress';
      progress: number;
    }
  | {
      type: 'completed';
    }
  | {
      type: 'failed';
      error: Error;
    };
