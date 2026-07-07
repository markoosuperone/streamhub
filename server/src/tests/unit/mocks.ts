import { vi, type MockedObject } from "vitest";
import { IUuidGenerator } from "@/shared/utility/uuid-generator.ts";
import { IUserRepository } from "@/users/repository/user.repository.ts";
import { IHasher } from "@/auth/contracts/services/hasher.interface.ts";
import { ITokenProvider } from "@/auth/contracts/services/tokenProvider.interface.ts";
import { ISessionRepository } from "@/auth/contracts/repository/session.interface.ts";
import {
  ITransactionManager,
  IDbTransaction,
} from "@/transaction/repository/transaction.interface.ts";
import { IMediaStorage } from "@/media/contracts/repository/mediaStorage.interface.ts";
import { IFileService } from "@/media/contracts/services/fileService.interface.ts";
import { IPlaylistRepository } from "@/playlists/contracts/repository/playlist.repository.interface.ts";
import { IPlaylistItemRepository } from "@/playlists/contracts/repository/playlist-item.repository.interface.ts";

export const mockUuidGenerator = (): MockedObject<IUuidGenerator> => ({
  generate: vi.fn(),
});

export const mockUserRepository = (): MockedObject<IUserRepository> =>
  ({
    getUserByEmail: vi.fn(),
    createUser: vi.fn(),
    getUserById: vi.fn(),
  }) as unknown as MockedObject<IUserRepository>;

export const mockHasher = (): MockedObject<IHasher> => ({
  hash: vi.fn(),
  verify: vi.fn(),
});

export const mockTokenProvider = (): MockedObject<ITokenProvider> =>
  ({
    generateToken: vi.fn(),
    verifyAccessToken: vi.fn(),
    verifyRefreshToken: vi.fn(),
  }) as unknown as MockedObject<ITokenProvider>;

export const mockSessionRepository = (): MockedObject<ISessionRepository> =>
  ({
    createSession: vi.fn(),
    checkRefreshToken: vi.fn(),
    getSessionById: vi.fn(),
    updateSession: vi.fn(),
    deleteSession: vi.fn(),
  }) as unknown as MockedObject<ISessionRepository>;

export const mockTransactionManager = (): MockedObject<ITransactionManager<IDbTransaction>> =>
  ({
    withTransaction: vi.fn(async (callback) => callback({} as IDbTransaction)),
  }) as unknown as MockedObject<ITransactionManager<IDbTransaction>>;

export const mockMediaRepository = (): MockedObject<IMediaStorage> => ({
  create: vi.fn(),
  getById: vi.fn(),
  getAllItems: vi.fn(),
  delete: vi.fn(),
});

export const mockFileService = (): MockedObject<IFileService> =>
  ({
    createWriteStream: vi.fn(),
    createReadStream: vi.fn(),
    createReadStreamWithRange: vi.fn(),
    normalizeFileName: vi.fn(),
    normalizeFilePath: vi.fn(),
    deleteFile: vi.fn(),
    stat: vi.fn(),
    getMediaDuration: vi.fn(),
  }) as unknown as MockedObject<IFileService>;

export const mockPlaylistRepository = (): MockedObject<IPlaylistRepository> =>
  ({
    create: vi.fn(),
    getById: vi.fn(),
    getByOwnerId: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  }) as unknown as MockedObject<IPlaylistRepository>;

export const mockPlaylistItemRepository = (): MockedObject<IPlaylistItemRepository> =>
  ({
    create: vi.fn(),
    getById: vi.fn(),
    getByPlaylistId: vi.fn(),
    getByPlaylistIdPaginated: vi.fn(),
    update: vi.fn(),
    updateForOwner: vi.fn(),
    deleteForOwner: vi.fn(),
    getByPlaylistIdAndPosition: vi.fn(),
    decrementPosition: vi.fn(),
    incrementPosition: vi.fn(),
    decrementPositionsAfter: vi.fn(),
  }) as unknown as MockedObject<IPlaylistItemRepository>;
