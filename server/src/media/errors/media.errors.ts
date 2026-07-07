import { CustomError } from "@/shared/error/error.ts";

const MediaErrors = {
  MEDIA_NOT_FOUND: "Media not found",
  SAVE_MEDIA_FILE_ERROR: "Failed to save media file",
  GET_MEDIA_RECORD_ERROR: "Failed to get media record",
  CREATE_MEDIA_RECORD_ERROR: "Failed to create media record",
  DELETE_MEDIA_ERROR: "Failed to delete media",
  UNSUPPORTED_FILE_TYPE: "Unsupported file type",
  INVALID_FILE_PATH: "Invalid file path",
  INVALID_RANGE_FORMAT: "Invalid range format",
  RANGE_NOT_SATISFIABLE: "Range not satisfiable",
  FILE_SIZE_IS_ZERO: "File size is zero",
  DELETE_MEDIA_RECORD_ERROR: "Failed to delete media record",
  FILE_NOT_FOUND: "File not found",
  FILE_SIZE_LIMIT_EXCEEDED: "File size limit exceeded",
} as const;
export class MediaNotFoundError extends CustomError {
  constructor() {
    super(MediaErrors.MEDIA_NOT_FOUND, 404);
    this.name = "MediaNotFoundError";
  }
}

export class SaveMediaFileError extends CustomError {
  constructor() {
    super(MediaErrors.SAVE_MEDIA_FILE_ERROR, 500);
    this.name = "SaveMediaFileError";
  }
}

export class GetMediaRecordError extends CustomError {
  constructor() {
    super(MediaErrors.GET_MEDIA_RECORD_ERROR, 500);
    this.name = "GetMediaRecordError";
  }
}

export class CreateMediaRecordError extends CustomError {
  constructor() {
    super(MediaErrors.CREATE_MEDIA_RECORD_ERROR, 500);
    this.name = "CreateMediaRecordError";
  }
}

export class DeleteMediaError extends CustomError {
  constructor() {
    super(MediaErrors.DELETE_MEDIA_ERROR, 500);
    this.name = "DeleteMediaError";
  }
}
export class UnsupportedFileTypeError extends CustomError {
  constructor() {
    super(MediaErrors.UNSUPPORTED_FILE_TYPE, 400);
    this.name = "UnsupportedFileTypeError";
  }
}
export class InvalidFilePathError extends CustomError {
  constructor() {
    super(MediaErrors.INVALID_FILE_PATH, 400);
    this.name = "InvalidFilePathError";
  }
}
export class InvalidRangeFormatError extends CustomError {
  constructor() {
    super(MediaErrors.INVALID_RANGE_FORMAT, 400);
    this.name = "InvalidRangeFormatError";
  }
}
export class RangeNotSatisfiableError extends CustomError {
  // RFC 9110: 416 uses "Content-Range: bytes */N" where N is the representation length.
  constructor(fileSize: number) {
    super(MediaErrors.RANGE_NOT_SATISFIABLE, 416, {
      "Content-Range": `bytes */${fileSize}`,
      "Accept-Ranges": "bytes",
    });
    this.name = "RangeNotSatisfiableError";
  }
}
export class FileSizeIsZeroError extends CustomError {
  constructor() {
    super(MediaErrors.FILE_SIZE_IS_ZERO, 400);
    this.name = "FileSizeIsZeroError";
  }
}
export class DeleteMediaRecordError extends CustomError {
  constructor() {
    super(MediaErrors.DELETE_MEDIA_RECORD_ERROR, 500);
    this.name = "DeleteMediaRecordError";
  }
}

export class FileNotFoundError extends CustomError {
  constructor() {
    super(MediaErrors.FILE_NOT_FOUND, 400);
    this.name = "FileNotFoundError";
  }
}

export class FileSizeLimitExceededError extends CustomError {
  constructor() {
    super(MediaErrors.FILE_SIZE_LIMIT_EXCEEDED, 400);
    this.name = "FileSizeLimitExceededError";
  }
}