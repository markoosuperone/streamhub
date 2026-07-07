import {
  CreateWriteStreamInputDTO,
  CreateWriteStreamResultDTO,
} from "@/media/dto/media.dto.ts";

export interface IFileService {
  createWriteStream(
    input: CreateWriteStreamInputDTO
  ): Promise<CreateWriteStreamResultDTO>;
  createReadStream(file_path: string): Promise<NodeJS.ReadableStream>;
  createReadStreamWithRange(
    file_path: string,
    mime_type: string,
    range: string
  ): Promise<{
    stream: NodeJS.ReadableStream;
    headers: Record<string, string>;
    statusCode: number;
  }>;
  normalizeFileName(fileName: string): { ext: string; sanitized: string };
  normalizeFilePath(filePath: string): string;
  deleteFile(filePath: string): Promise<boolean>;
  stat(filePath: string): Promise<{ size: number;}>;
  getMediaDuration(filePath: string): Promise<number>;
}
