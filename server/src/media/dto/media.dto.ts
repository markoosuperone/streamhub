import { IMedia, MediaType } from "@/media/domain/media.domain.ts";

export interface CreateMediaDTO {
  id: string;
  owner_id: string;
  media_type: MediaType;
  description?: string | null;
  file_path: string;
  mime_type: string;
  size_bytes: number;
  duration_seconds: number;
  title: string;
}

export interface UploadMediaInputDTO {
  owner_id: string;
  media_type: MediaType;
  description?: string | null;
  mime_type: string;
  original_name: string;
  stream: NodeJS.ReadableStream;
}

export interface MediaResponseDTO {
  id: string;
  owner_id: string;
  media_type: MediaType;
  description?: string | null;
  file_path: string;
  mime_type: string;
  size_bytes: number;
  duration_seconds: number;
  title: string;
}

export interface ExecuteMediaInputDTO {
  userId: string;
  mediaId: string;
  range?: string;
}

export interface CreateWriteStreamInputDTO {
  stream: NodeJS.ReadableStream;
  mime_type: string;
  file_name: string;
  owner_id: string;
  id: string;
}

export interface CreateWriteStreamResultDTO {
  file_path: string;
}

export interface GetMediaByOwnerIdRepoResponse {
  total: number;
  items: IMedia[];
}
