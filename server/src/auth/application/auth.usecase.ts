import {
  AuthResultDTO,
  LoginAuthDTO,
  RefreshTokenResultDTO,
  RegisterAuthDTO,
  toUserDTO,
  UpdateSessionDTO,
} from "@/auth/dto/auth.dto.ts";
import { IUserRepository } from "@/users/repository/user.repository.ts";
import { ISessionRepository } from "@/auth/contracts/repository/session.interface.ts";
import { IHasher } from "@/auth/contracts/services/hasher.interface.ts";
import { ITokenProvider } from "@/auth/contracts/services/tokenProvider.interface.ts";
import { ITransactionManager } from "@/transaction/repository/transaction.interface.ts";
import { IUuidGenerator } from "@/shared/utility/uuid-generator.ts";
import postgres from "postgres";
import {
  InvalidEmailOrPasswordError,
  InvalidRefreshTokenError,
  UserAlreadyExistsError,
} from "@/auth/error/errors.ts";
import { logger } from "@/shared/logger/logger.ts";

export interface IAuthUsecase {
  registerAuth: (auth: RegisterAuthDTO) => Promise<AuthResultDTO>;
  loginAuth: (auth: LoginAuthDTO) => Promise<AuthResultDTO>;
  logoutAuth: (sessionId: string) => Promise<void>;
  refreshToken: (refreshToken: string) => Promise<RefreshTokenResultDTO>;
}

export class AuthUsecase implements IAuthUsecase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly hasher: IHasher,
    private readonly tokenProvider: ITokenProvider,
    private readonly sessionRepository: ISessionRepository,
    private readonly transactionManager: ITransactionManager<postgres.TransactionSql>,
    private readonly uuidGenerator: IUuidGenerator
  ) {}

  async registerAuth({
    email,
    password,
  }: RegisterAuthDTO): Promise<AuthResultDTO> {
    // Check if user already exists
    const existingUser = await this.userRepository.getUserByEmail({ email });
    if (existingUser) {
      throw new UserAlreadyExistsError();
    }

    // Hash password
    const password_hash = await this.hasher.hash(password);

    return this.transactionManager.withTransaction(async (tx) => {
      // Create user
      const user = await this.userRepository.createUser(
        {
          email,
          password_hash,
        },
        tx
      );
      // Generate tokens
      const session_id = this.uuidGenerator.generate();
      const tokens = this.tokenProvider.generateToken({
        user_id: user.id,
        session_id: session_id,
      });
      const refresh_token_hash = await this.hasher.hash(tokens.refresh_token);
      const session = {
        id: session_id,
        user_id: user.id,
        token_hash: refresh_token_hash,
        expires_at: tokens.refresh_token_expires_at,
      };
      await this.sessionRepository.createSession(session, tx);
      return {
        user: toUserDTO(user),
        session_id,
        ...tokens,
      };
    });
  }

  async loginAuth({ email, password }: LoginAuthDTO): Promise<AuthResultDTO> {
    // Find user by email
    const user = await this.userRepository.getUserByEmail({ email });
    if (!user) {
      throw new InvalidEmailOrPasswordError();
    }

    // Verify password
    const isPasswordValid = await this.hasher.verify(
      password,
      user.password_hash
    );
    if (!isPasswordValid) {
      throw new InvalidEmailOrPasswordError();
    }

    // Generate tokens
    const session_id = this.uuidGenerator.generate();
    const tokens = this.tokenProvider.generateToken({
      user_id: user.id,
      session_id: session_id,
    });
    const refresh_token_hash = await this.hasher.hash(tokens.refresh_token);
    const session = {
      id: session_id,
      user_id: user.id,
      token_hash: refresh_token_hash,
      expires_at: tokens.refresh_token_expires_at,
    };
    await this.sessionRepository.createSession(session);
    return {
      user: toUserDTO(user),
      session_id,
      ...tokens,
    };
  }

  async logoutAuth(sessionId: string): Promise<void> {
    await this.sessionRepository.deleteSession(sessionId);
  }

  async refreshToken(refreshToken: string): Promise<RefreshTokenResultDTO> {
    const verifyTokenPayload =
      this.tokenProvider.verifyRefreshToken(refreshToken);
    const isInvalidTokenPayload =
      typeof verifyTokenPayload !== "object" ||
      verifyTokenPayload === null ||
      !("user_id" in verifyTokenPayload) ||
      !("session_id" in verifyTokenPayload);

    if (isInvalidTokenPayload) {
      throw new InvalidRefreshTokenError();
    }
    const session_id = verifyTokenPayload["session_id"];

    const session = await this.sessionRepository.getSessionById(session_id);
    if (!session) {
      throw new InvalidRefreshTokenError();
    }

    const isTokenValid = await this.hasher.verify(
      refreshToken,
      session.token_hash
    );
    if (!isTokenValid) {
      // The session exists but the presented token doesn't match its stored
      // hash — unlike an unknown/expired session, this can indicate reuse of
      // a stale or tampered refresh token.
      logger.warn(
        { sessionId: session_id, userId: session.user_id },
        "Refresh token did not match stored hash for an active session"
      );
      throw new InvalidRefreshTokenError();
    }
    const tokens = this.tokenProvider.generateToken({
      user_id: session.user_id,
      session_id,
    });

    const new_refresh_token_hash = await this.hasher.hash(tokens.refresh_token);

    const updateSession: UpdateSessionDTO = {
      id: session_id,
      token_hash: new_refresh_token_hash,
      expires_at: tokens.refresh_token_expires_at,
    };

    await this.sessionRepository.updateSession(updateSession);

    return {
      ...tokens,
    };
  }
}
