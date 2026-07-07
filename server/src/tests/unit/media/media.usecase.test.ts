import { describe, it, expect, vi, beforeEach, type MockedObject } from "vitest";
import { IMediaStorage } from "@/media/contracts/repository/mediaStorage.interface.ts";
import { IFileService } from "@/media/contracts/services/fileService.interface.ts";
import { MediaUsecase } from "@/media/application/media.usecase.ts";
import { MediaNotFoundError } from "@/media/errors/media.errors.ts";
import { makeMedia, makeStream } from "@/tests/unit/factories.ts";
import { mockMediaRepository, mockFileService, mockUuidGenerator } from "@/tests/unit/mocks.ts";

// ── Constants ─────────────────────────────────────────────────────────────────

const OWNER_ID = "owner-1";
const MEDIA_ID = "media-id-1";
const MIME_TYPE = "video/mp4";
const MEDIA_TYPE = "video" as const;
const SIZE_BYTES = 1024;
const DURATION_SECONDS = 60;
const FILE_PATH = `/uploads/${MEDIA_ID}.mp4`;
const FAIL_FILE_PATH = "/uploads/fail.mp4";
const BYTE_RANGE = "bytes=0-1023";
const DESCRIPTION = "A test video";
const USER_ID = "userId";

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("MediaUsecase", () => {
  let mediaRepository: MockedObject<IMediaStorage>;
  let fileService: MockedObject<IFileService>;
  let usecase: MediaUsecase;

  beforeEach(() => {
    vi.clearAllMocks();
    mediaRepository = mockMediaRepository();
    fileService = mockFileService();
    usecase = new MediaUsecase(mediaRepository, fileService, mockUuidGenerator());
  });

  // ── upload ──────────────────────────────────────────────────────────────────

  describe("upload", () => {
    const buildInput = () => ({
      stream: makeStream(),
      mime_type: MIME_TYPE,
      original_name: "my-video.mp4",
      owner_id: OWNER_ID,
      media_type: MEDIA_TYPE,
      description: DESCRIPTION,
    });

    it("creates the file and persists the media record", async () => {
      const media = makeMedia();
      fileService.createWriteStream.mockResolvedValue({ file_path: FILE_PATH });
      fileService.stat.mockResolvedValue({ size: SIZE_BYTES });
      fileService.getMediaDuration.mockResolvedValue(DURATION_SECONDS);
      mediaRepository.create.mockResolvedValue(media);

      await usecase.upload(buildInput());

      expect(fileService.createWriteStream).toHaveBeenCalledOnce();
      expect(mediaRepository.create).toHaveBeenCalledOnce();
      expect(mediaRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          owner_id: OWNER_ID,
          mime_type: MIME_TYPE,
          size_bytes: SIZE_BYTES,
          duration_seconds: DURATION_SECONDS,
          media_type: MEDIA_TYPE,
          description: DESCRIPTION,
        })
      );
    });

    it("deletes the file and re-throws when mediaRepository.create fails", async () => {
      const dbError = new Error("DB unavailable");
      fileService.createWriteStream.mockResolvedValue({ file_path: FAIL_FILE_PATH });
      fileService.stat.mockResolvedValue({ size: SIZE_BYTES });
      fileService.getMediaDuration.mockResolvedValue(30);
      mediaRepository.create.mockRejectedValue(dbError);

      await expect(usecase.upload(buildInput())).rejects.toThrow("DB unavailable");
      expect(fileService.deleteFile).toHaveBeenCalledWith(FAIL_FILE_PATH);
    });

    it("deletes the file and re-throws when stat fails", async () => {
      fileService.createWriteStream.mockResolvedValue({ file_path: FAIL_FILE_PATH });
      fileService.stat.mockRejectedValue(new Error("stat error"));

      await expect(usecase.upload(buildInput())).rejects.toThrow("stat error");
      expect(fileService.deleteFile).toHaveBeenCalledWith(FAIL_FILE_PATH);
    });
  });

  // ── execute ─────────────────────────────────────────────────────────────────

  describe("execute", () => {
    it("returns stream + headers when media exists", async () => {
      const media = makeMedia();
      const streamResult = {
        stream: makeStream(),
        headers: { "Content-Type": MIME_TYPE },
        statusCode: 206,
      };

      mediaRepository.getById.mockResolvedValue(media);
      fileService.createReadStreamWithRange.mockResolvedValue(streamResult);

      const result = await usecase.execute({
        userId: USER_ID,
        mediaId: MEDIA_ID,
        range: BYTE_RANGE,
      });

      expect(mediaRepository.getById).toHaveBeenCalledWith(MEDIA_ID);
      expect(fileService.createReadStreamWithRange).toHaveBeenCalledWith(
        media.file_path,
        media.mime_type,
        BYTE_RANGE
      );
      expect(result).toEqual(streamResult);
    });

    it("throws MediaNotFoundError when media does not exist", async () => {
      mediaRepository.getById.mockResolvedValue(null);

      await expect(
        usecase.execute({ mediaId: "missing", userId: USER_ID })
      ).rejects.toThrow(MediaNotFoundError);
      expect(fileService.createReadStreamWithRange).not.toHaveBeenCalled();
    });
  });

  // ── getAllItems ──────────────────────────────────────────────────────────────

  describe("getAllItems", () => {
    it("returns a paginated response with correct shape", async () => {
      const items = [makeMedia(), makeMedia({ id: "media-id-2" })];
      mediaRepository.getAllItems.mockResolvedValue({ total: 50, items });

      const result = await usecase.getAllItems(10, 20);

      expect(mediaRepository.getAllItems).toHaveBeenCalledWith(10, 20);
      expect(result).toEqual({ items, total: 50, limit: 10, offset: 20 });
    });

    it("returns empty items array when repository is empty", async () => {
      mediaRepository.getAllItems.mockResolvedValue({ total: 0, items: [] });

      const result = await usecase.getAllItems(5, 0);

      expect(result).toEqual({ items: [], total: 0, limit: 5, offset: 0 });
    });
  });

  // ── delete ───────────────────────────────────────────────────────────────────

  describe("delete", () => {
    it("deletes the media record and underlying file", async () => {
      const media = makeMedia();
      mediaRepository.delete.mockResolvedValue(media);

      await usecase.delete(MEDIA_ID);

      expect(mediaRepository.delete).toHaveBeenCalledWith(MEDIA_ID);
      expect(fileService.deleteFile).toHaveBeenCalledWith(media.file_path);
    });

    it("throws MediaNotFoundError when repository.delete returns null", async () => {
      mediaRepository.getById.mockResolvedValue(makeMedia());
      mediaRepository.delete.mockResolvedValue(null);

      await expect(usecase.delete(MEDIA_ID)).rejects.toThrow(MediaNotFoundError);
      expect(fileService.deleteFile).not.toHaveBeenCalled();
    });
  });
});
