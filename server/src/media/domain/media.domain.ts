import { MediaType } from "../dto/media.dto.ts";

export interface IMedia {
  id: string;
  owner_id: string;
  media_type: MediaType;
  description?: string | null;
  file_path: string;
  mime_type: string;
  size_bytes: number;
  duration_seconds: number;
  title: string;
  created_at: Date;
  updated_at: Date;
} 
