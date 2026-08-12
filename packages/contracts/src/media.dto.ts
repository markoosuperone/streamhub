export type MediaType = "image" | "video" | "audio";

export interface MediaListQueryDTO {
  limit?: number;
  offset?: number;
  search?: string;
  // "image" is a valid MediaType elsewhere, but no upload path can produce
  // one yet, so it isn't offered as a filterable value here.
  type?: Extract<MediaType, "audio" | "video">;
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
  // Whether a thumbnail was produced for this item — generation is best-effort
  // and yields nothing for audio without embedded cover art. Lets a client skip
  // requesting artwork that does not exist.
  has_thumbnail: boolean;
}
