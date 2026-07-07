import { PostgresTransactionManager } from "@/transaction/infrastructure/PostgresTransactionManager.ts";

import { PGUserRepository } from "@/users/infrastructure/db/PGUserRepository.ts";

import { Hasher } from "@/auth/infrastructure/service/hasher.ts";
import { TokenProvider } from "@/auth/infrastructure/service/tokenProvider.ts";
import { AuthService } from "@/auth/infrastructure/service/auth.ts";
import { SessionRepository } from "@/auth/infrastructure/db/session.repository.ts";
import { AuthUsecase } from "@/auth/application/auth.usecase.ts";
import { AuthController } from "@/auth/infrastructure/http/auth.controller.ts";
import { AuthRoute } from "@/auth/infrastructure/http/auth.route.ts";

import { MediaRepository } from "@/media/infrastructure/db/media.repository.ts";
import { FileService } from "@/media/infrastructure/file/file.service.ts";
import { MediaUsecase } from "@/media/application/media.usecase.ts";
import { MediaController } from "@/media/infrastructure/http/media.controller.ts";
import { MediaRoute } from "@/media/infrastructure/http/media.router.ts";

import { PlaylistRepository } from "@/playlists/infrastructure/db/playlist.repository.ts";
import { PlaylistUsecase } from "@/playlists/application/playlist.usecase.ts";
import { PlaylistController } from "@/playlists/infrastructure/http/playlist.controller.ts";
import { PlaylistRouter } from "@/playlists/infrastructure/http/playlist.router.ts";

import { PlaylistItemRepository } from "@/playlists/infrastructure/db/playlist-item.repository.ts";
import { PlaylistItemUsecase } from "@/playlists/application/playlist-item.usecase.ts";
import { PlaylistItemController } from "@/playlists/infrastructure/http/playlist-item.controller.ts";
import { PlaylistItemRouter } from "@/playlists/infrastructure/http/playlist-item.router.ts";

import { UuidGenerator } from "@/shared/utility/uuid-generator.ts";
import { HealthCheckRouter } from "@/server/health/health.route.ts";

export interface Container {
  authRoute: AuthRoute;
  mediaRoute: MediaRoute;
  playlistRouter: PlaylistRouter;
  playlistItemRouter: PlaylistItemRouter;
  healthCheckRouter: HealthCheckRouter;
}

export function buildContainer(): Container {
  // ── Shared ──────────────────────────────────────────────────────────────────
  const transactionManager = new PostgresTransactionManager();
  const tokenProvider = new TokenProvider();
  const authService = new AuthService(tokenProvider);
  const uuidGenerator = new UuidGenerator();

  // ── Auth ────────────────────────────────────────────────────────────────────
  const authRoute = new AuthRoute(
    new AuthController(
      new AuthUsecase(
        new PGUserRepository(),
        new Hasher(),
        tokenProvider,
        new SessionRepository(),
        transactionManager,
        uuidGenerator
      ),
      authService
    )
  );

  // ── Media ───────────────────────────────────────────────────────────────────
  const mediaRepository = new MediaRepository();
  const mediaRoute = new MediaRoute(
    new MediaController(
      new MediaUsecase(mediaRepository, new FileService(), uuidGenerator),
      authService
    )
  );

  // ── Playlist ─────────────────────────────────────────────────────────────────
  const playlistRepository = new PlaylistRepository();
  const playlistRouter = new PlaylistRouter(
    new PlaylistController(
      new PlaylistUsecase(playlistRepository),
      authService
    )
  );

  // ── Playlist Item ─────────────────────────────────────────────────────────────
  const playlistItemRouter = new PlaylistItemRouter(
    new PlaylistItemController(
      new PlaylistItemUsecase(
        new PlaylistItemRepository(),
        transactionManager,
        mediaRepository,
        playlistRepository
      ),
      authService
    )
  );

  return {
    authRoute,
    mediaRoute,
    playlistRouter,
    playlistItemRouter,
    healthCheckRouter: new HealthCheckRouter(),
  };
}