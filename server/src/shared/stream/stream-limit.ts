import { Transform, type TransformCallback } from "node:stream";

export class SizeLimitStream extends Transform {
  private totalBytes = 0;

  constructor(
    private maxSize: number,
    private readonly onLimitExceeded: () => Error = () =>
      new Error("File size limit exceeded")
  ) {
    super();
  }

  override _transform(
    chunk: Buffer,
    _encoding: BufferEncoding,
    callback: TransformCallback
  ) {
    this.totalBytes += chunk.length;

    if (this.totalBytes > this.maxSize) {
      callback(this.onLimitExceeded());
      return;
    }

    callback(null, chunk);
  }
}
