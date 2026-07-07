import { env } from "@/config/index.ts";
import { IFileService } from "@/media/contracts/services/fileService.interface.ts";
import {
  CreateWriteStreamInputDTO,
  CreateWriteStreamResultDTO,
} from "@/media/dto/media.dto.ts";
import {
  FileSizeIsZeroError,
  InvalidFilePathError,
  InvalidRangeFormatError,
  RangeNotSatisfiableError,
  UnsupportedFileTypeError,
} from "@/media/errors/media.errors.ts";
import { SizeLimitStream } from "@/shared/stream/stream-limit.ts";
import { FileSizeLimitExceededError } from "@/media/errors/media.errors.ts";
import fs from "node:fs";
import { stat } from "node:fs/promises";
import {
  basename,
  dirname,
  extname,
  isAbsolute,
  relative,
  resolve,
} from "node:path";
import { PassThrough } from "node:stream";
import { pipeline } from "node:stream/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { logger, markLogged } from "@/shared/logger/logger.ts";

const STORAGE_DIR = "storage";
const execFileAsync = promisify(execFile);

export class FileService implements IFileService {
  constructor() {}

  async createWriteStream(
    input: CreateWriteStreamInputDTO
  ): Promise<CreateWriteStreamResultDTO> {
    const { stream, mime_type, file_name, id: mediaId } = input;
    const file_path = input.owner_id + "/" + mediaId;
    const MAX_SIZE = env.media.maxFileSizeBytes;
    const firstChunk = await this.readFirstChunk(stream);
    const { sanitized } = await this.validateUploadedFile({
      fileName: file_name,
      mimeType: mime_type,
      firstChunk,
    });
    const file_path_with_sanitized_name = `${file_path}/${sanitized}`;
    const fullPath = this.normalizeFilePath(file_path_with_sanitized_name);
    const restoredStream = this.restoreStream(stream, firstChunk);
    const sizeLimiter = new SizeLimitStream(
      MAX_SIZE,
      () => new FileSizeLimitExceededError()
    );
    try {
      await fs.promises.mkdir(dirname(fullPath), { recursive: true });
      await pipeline(restoredStream, sizeLimiter, fs.createWriteStream(fullPath));
    } catch (error) {
      if (error instanceof FileSizeLimitExceededError) {
        throw error;
      }
      logger.error(
        { err: error, mediaId, ownerId: input.owner_id },
        "Failed to write media file to disk"
      );
      markLogged(error);
      throw error;
    }

    return { file_path: fullPath };
  }
  private restoreStream(
    stream: NodeJS.ReadableStream,
    firstChunk: Buffer
  ): NodeJS.ReadableStream {
    const restoredStream = new PassThrough();

    restoredStream.write(firstChunk);

    stream.pipe(restoredStream);
    stream.on("error", (error) => restoredStream.destroy(error));
    stream.on("end", () => restoredStream.end());
    return restoredStream;
  }
  async createReadStream(file_path: string): Promise<NodeJS.ReadableStream> {
    return fs.createReadStream(file_path);
  }
  async createReadStreamWithRange(
    file_path: string,
    mime_type: string,
    range: string
  ): Promise<{
    stream: NodeJS.ReadableStream;
    headers: Record<string, string>;
    statusCode: number;
  }> {
    const safePath = this.normalizeFilePath(file_path);
    let stat: fs.Stats;
    try {
      stat = await fs.promises.stat(safePath);
    } catch (error) {
      logger.error({ err: error, filePath: file_path }, "Failed to stat media file");
      markLogged(error);
      throw error;
    }
    const fileSize = stat.size;

    if (!range) {
      return {
        stream: fs.createReadStream(safePath),
        statusCode: 200,
        headers: {
          "Content-Type": mime_type,
          "Content-Length": fileSize.toString(),
          "Accept-Ranges": "bytes",
        },
      };
    }
    const { start, end } = this.parseRange(range, fileSize);
    const chunkSize = end - start + 1;
    const stream = fs.createReadStream(safePath, { start, end });

    return {
      stream,
      statusCode: 206,
      headers: {
        "Content-Type": mime_type,
        "Content-Length": chunkSize.toString(),
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Accept-Ranges": "bytes",
      },
    };
  }
  private async readFirstChunk(stream: NodeJS.ReadableStream): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const onData = (chunk: Buffer | string) => {
        cleanup();
        resolve(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      };

      const onError = (error: Error) => {
        cleanup();
        reject(error);
      };

      const onEnd = () => {
        cleanup();
        reject(new Error("Stream ended before file header was read"));
      };

      const cleanup = () => {
        stream.off("data", onData);
        stream.off("error", onError);
        stream.off("end", onEnd);
        stream.pause();
      };

      stream.once("data", onData);
      stream.once("error", onError);
      stream.once("end", onEnd);
      stream.resume();
    });
  }
  async getMediaDuration(filePath: string): Promise<number> {
    let stdout: string;
    try {
      ({ stdout } = await execFileAsync(
        "ffprobe",
        [
          "-v",
          "error",
          "-show_entries",
          "format=duration",
          "-of",
          "default=noprint_wrappers=1:nokey=1",
          filePath,
        ]
      ));
    } catch (error) {
      logger.error({ err: error, filePath }, "ffprobe failed to read media duration");
      markLogged(error);
      throw error;
    }

    return Math.round(Number(stdout.trim()));
  }

  normalizeFileName(fileName: string): { ext: string; sanitized: string } {
    const base = basename(fileName);
    let extension = extname(base);
    let name = basename(base, extension);

    // remove all non-alphanumeric characters
    // replace multiple underscores with a single underscore
    // remove leading and trailing underscores
    name = name.replace(/[^a-zA-Z0-9_-]/g, "_");
    name = name.replace(/_+/g, "_");
    name = name.replace(/^_+|_+$/g, "");

    // if name is empty, set it to "file"
    if (!name) name = "file";

    // remove all non-alphanumeric characters from extension
    extension = extension.replace(/[^a-z0-9.]/g, "");
    const allowedExt = [".mp4", ".mp3", ".wav", ".webm", ".ogg", ".m4a"];
    if (extension && !allowedExt.includes(extension)) {
      throw new UnsupportedFileTypeError();
    }
    let sanitized = name + extension;

    // if sanitized is longer than 255 characters, truncate the name
    if (sanitized.length > 255) {
      const maxNameLength = 255 - extension.length;
      sanitized = name.slice(0, maxNameLength) + extension;
    }
    return { ext: extension, sanitized };
  }
  normalizeFilePath(filePath: string): string {
    if (!filePath || filePath.trim().length === 0) {
      throw new InvalidFilePathError();
    }

    const storageDir = resolve(STORAGE_DIR);
    const safePath = resolve(storageDir, filePath);
    const relativePath = relative(storageDir, safePath);
    if (relativePath.startsWith("..") || isAbsolute(relativePath)) {
      throw new InvalidFilePathError();
    }

    return safePath;
  }

  async validateUploadedFile({
    fileName,
    mimeType,
    firstChunk,
  }: {
    fileName: string;
    mimeType: string;
    firstChunk: Buffer;
  }): Promise<{ ext: string; mime: string; sanitized: string }> {
    const mediaType = this.detectMediaType(firstChunk);
    const { ext, sanitized } = this.normalizeFileName(fileName);
    if (
      !env.media.allowedMimeTypes.includes(mimeType) ||
      mediaType?.ext !== ext ||
      !env.media.allowedMimeTypes.includes(mediaType?.mime)
    ) {
      logger.warn(
        {
          declaredMimeType: mimeType,
          declaredExtension: ext,
          detectedMimeType: mediaType?.mime ?? null,
          detectedExtension: mediaType?.ext ?? null,
        },
        "Uploaded file content does not match its declared type"
      );
      throw new UnsupportedFileTypeError();
    }
    return { ext, mime: mediaType.mime, sanitized };
  }
  private detectMediaType(
    buffer: Buffer
  ): { ext: string; mime: string } | null {
    if (this.isMp4(buffer)) {
      return { ext: ".mp4", mime: "video/mp4" };
    }

    if (this.isMp3(buffer)) {
      return { ext: ".mp3", mime: "audio/mpeg" };
    }

    if (this.isWav(buffer)) {
      return { ext: ".wav", mime: "audio/wav" };
    }

    if (this.isWebm(buffer)) {
      return { ext: ".webm", mime: "video/webm" };
    }

    if (this.isOgg(buffer)) {
      return { ext: ".ogg", mime: "audio/ogg" };
    }

    if (this.isM4a(buffer)) {
      return { ext: ".m4a", mime: "audio/mp4" };
    }

    return null;
  }

  private isMp4(buffer: Buffer): boolean {
    return (
      buffer.length >= 12 && buffer.subarray(4, 8).toString("ascii") === "ftyp"
    );
  }

  private isMp3(buffer: Buffer): boolean {
    const b0 = buffer[0];
    const b1 = buffer[1];

    if (b0 === undefined || b1 === undefined) {
      return false;
    }

    if (buffer.length >= 3) {
      const b2 = buffer[2];
      if (b2 !== undefined && String.fromCharCode(b0, b1, b2) === "ID3") {
        return true;
      }
    }

    return b0 === 0xff && (b1 & 0xe0) === 0xe0;
  }

  private isWav(buffer: Buffer): boolean {
    return (
      buffer.length >= 12 &&
      buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
      buffer.subarray(8, 12).toString("ascii") === "WAVE"
    );
  }

  private isWebm(buffer: Buffer): boolean {
    return (
      buffer.length >= 4 &&
      buffer[0] === 0x1a &&
      buffer[1] === 0x45 &&
      buffer[2] === 0xdf &&
      buffer[3] === 0xa3
    );
  }

  private isOgg(buffer: Buffer): boolean {
    return (
      buffer.length >= 4 && buffer.subarray(0, 4).toString("ascii") === "OggS"
    );
  }

  private isM4a(buffer: Buffer): boolean {
    return (
      buffer.length >= 12 &&
      buffer.subarray(4, 8).toString("ascii") === "ftyp" &&
      (buffer.subarray(8, 12).toString("ascii") === "M4A " ||
        buffer.subarray(8, 12).toString("ascii") === "isom" ||
        buffer.subarray(8, 12).toString("ascii") === "mp42")
    );
  }
  async stat(filePath: string): Promise<{ size: number;}> {
    try {
      const stats = await stat(filePath);
      return {
        size: stats.size,
      };
    } catch (error) {
      logger.error({ err: error, filePath }, "Failed to stat media file");
      markLogged(error);
      throw error;
    }
  }

  private parseRange(
    range: string,
    fileSize: number
  ): { start: number; end: number } {
    if (fileSize === 0) {
      throw new FileSizeIsZeroError();
    }
    const match = range.match(/^bytes=(\d*)-(\d*)$/);

    if (!match) {
      throw new InvalidRangeFormatError();
    }

    const startRaw = match[1];
    const endRaw = match[2];

    let start: number;
    let end: number;

    // bytes=-500
    if (!startRaw && endRaw) {
      const suffixLength = parseInt(endRaw, 10);

      if (!Number.isInteger(suffixLength) || suffixLength <= 0) {
        throw new RangeNotSatisfiableError(fileSize);
      }

      if (suffixLength >= fileSize) {
        start = 0;
      } else {
        start = fileSize - suffixLength;
      }

      end = fileSize - 1;
    }
    // bytes=100-
    else if (!endRaw && startRaw) {
      start = parseInt(startRaw, 10);

      if (!Number.isInteger(start) || start < 0 || start >= fileSize) {
        throw new RangeNotSatisfiableError(fileSize);
      }

      end = fileSize - 1;
    }
    // bytes=100-500
    else if (startRaw && endRaw) {
      start = parseInt(startRaw, 10);
      end = parseInt(endRaw, 10);

      if (
        !Number.isInteger(start) ||
        !Number.isInteger(end) ||
        start < 0 ||
        end < 0 ||
        start > end ||
        start >= fileSize
      ) {
        throw new RangeNotSatisfiableError(fileSize);
      }

      if (end >= fileSize) {
        end = fileSize - 1;
      }
    } else {
      throw new InvalidRangeFormatError();
    }

    return { start, end };
  }
  async deleteFile(filePath: string): Promise<boolean> {
    const safePath = this.normalizeFilePath(filePath);
    try {
      await fs.promises.stat(safePath);
      await fs.promises.unlink(safePath);
    } catch (error) {
      logger.error({ err: error, filePath }, "Failed to delete media file from disk");
      markLogged(error);
      throw error;
    }
    await this.removeEmptyDirsUpToStorage(dirname(safePath));
    return true;
  }

  /** Removes empty directories from `startDir` up to (but not including) `storage/`. */
  private async removeEmptyDirsUpToStorage(startDir: string): Promise<void> {
    const storageRoot = resolve(STORAGE_DIR);
    let dir = resolve(startDir);
    for (;;) {
      if (dir === storageRoot) return;
      const rel = relative(storageRoot, dir);
      if (rel === "" || rel.startsWith("..") || isAbsolute(rel)) return;
      try {
        await fs.promises.rmdir(dir);
      } catch (e: unknown) {
        const err = e as NodeJS.ErrnoException;
        if (err.code === "ENOTEMPTY" || err.code === "ENOENT") return;
        logger.error({ err, dir }, "Failed to remove empty media directory");
        markLogged(err);
        throw e;
      }
      dir = dirname(dir);
    }
  }
}
