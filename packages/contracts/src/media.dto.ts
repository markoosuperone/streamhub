export type MediaType = "image" | "video" | "audio";

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
