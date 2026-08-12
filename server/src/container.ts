import { PostgresTransactionManager } from "@/transaction/infrastructure/PostgresTransactionManager.ts";

import { PGUserRepository } from "@/users/infrastructure/db/PGUserRepository.ts";

import { Hasher } from "@/auth/infrastructure/service/hasher.ts";
import { TokenProvider } from "@/auth/infrastructure/service/tokenProvider.ts";
import { AuthService } from "@/auth/infrastructure/service/auth.ts";
import { SessionRepository } from "@/auth/infrastructure/db/session.repository.ts";
import { AuthUsecase } from "@/auth/application/auth.usecase.ts";
import { AuthController } from "@/auth/infrastructure/http/auth.controller.ts";
import { AuthRoute } from "@/auth/infrastructure/http/auth.route.ts";
import { createSessionRefreshHook } from "@/auth/infrastructure/http/session-refresh.hook.ts";

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

import { UserUsecase } from "@/users/application/user.usecase.ts";
import { UserController } from "@/users/infrastructure/http/user.controller.ts";
import { UserRouter } from "@/users/infrastructure/http/user.router.ts";

import { UuidGenerator } from "@/shared/utility/uuid-generator.ts";
import { HealthCheckRouter } from "@/server/health/health.route.ts";

export interface Container {
  sessionRefreshHook: ReturnType<typeof createSessionRefreshHook>;
  authRoute: AuthRoute;
  mediaRoute: MediaRoute;
  playlistRouter: PlaylistRouter;
  playlistItemRouter: PlaylistItemRouter;
  userRouter: UserRouter;
  healthCheckRouter: HealthCheckRouter;
}

export function buildContainer(): Container {
  // ── Shared ──────────────────────────────────────────────────────────────────
  const transactionManager = new PostgresTransactionManager();
  const tokenProvider = new TokenProvider();
  const authService = new AuthService(tokenProvider);
  const uuidGenerator = new UuidGenerator();

  // ── Auth ────────────────────────────────────────────────────────────────────
  const userRepository = new PGUserRepository();
  const authUsecase = new AuthUsecase(
    userRepository,
    new Hasher(),
    tokenProvider,
    new SessionRepository(),
    transactionManager,
    uuidGenerator,
  );
  const authRoute = new AuthRoute(new AuthController(authUsecase, authService));

  // ── Users ───────────────────────────────────────────────────────────────────
  const userRouter = new UserRouter(
    new UserController(new UserUsecase(userRepository), authService),
  );

  // ── Media ───────────────────────────────────────────────────────────────────
  const mediaRepository = new MediaRepository();
  const mediaRoute = new MediaRoute(
    new MediaController(
      new MediaUsecase(mediaRepository, new FileService(), uuidGenerator),
      authService,
    ),
  );

  // ── Playlist ─────────────────────────────────────────────────────────────────
  const playlistRepository = new PlaylistRepository();
  const playlistRouter = new PlaylistRouter(
    new PlaylistController(
      new PlaylistUsecase(playlistRepository),
      authService,
    ),
  );

  // ── Playlist Item ─────────────────────────────────────────────────────────────
  const playlistItemRouter = new PlaylistItemRouter(
    new PlaylistItemController(
      new PlaylistItemUsecase(
        new PlaylistItemRepository(),
        transactionManager,
        mediaRepository,
        playlistRepository,
      ),
      authService,
    ),
  );

  return {
    sessionRefreshHook: createSessionRefreshHook(authService, authUsecase),
    authRoute,
    mediaRoute,
    playlistRouter,
    playlistItemRouter,
    userRouter,
    healthCheckRouter: new HealthCheckRouter(),
  };
}
