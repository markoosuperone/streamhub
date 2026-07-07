import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type MockedObject,
} from "vitest";
import { AuthUsecase } from "@/auth/application/auth.usecase.ts";
import {
  ITransactionManager,
  IDbTransaction,
} from "@/transaction/repository/transaction.interface.ts";
import { IUserRepository } from "@/users/repository/user.repository.ts";
import { IHasher } from "@/auth/contracts/services/hasher.interface.ts";
import { ITokenProvider } from "@/auth/contracts/services/tokenProvider.interface.ts";
import { ISessionRepository } from "@/auth/contracts/repository/session.interface.ts";
import { IUuidGenerator } from "@/shared/utility/uuid-generator.ts";
import {
  InvalidEmailOrPasswordError,
  InvalidRefreshTokenError,
  UserAlreadyExistsError,
} from "@/auth/error/errors.ts";
import { makeUser, makeSession, makeTokens } from "@/tests/unit/factories.ts";
import {
  mockUserRepository,
  mockHasher,
  mockTokenProvider,
  mockSessionRepository,
  mockTransactionManager,
  mockUuidGenerator,
} from "@/tests/unit/mocks.ts";

// ── Constants ─────────────────────────────────────────────────────────────────

const USER_EMAIL = "test@test.com";
const USER_PASSWORD = "123456";
const USER_ID = "user-id";
const SESSION_ID = "session-id";
const PASSWORD_HASH = "password-hash";
const REFRESH_TOKEN = "refresh";
const REFRESH_TOKEN_HASH = "refresh-token-hash";
const NEW_ACCESS_TOKEN = "new-access";
const NEW_REFRESH_TOKEN = "new-refresh";

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("AuthUsecase", () => {
  let userRepository: MockedObject<IUserRepository>;
  let hasher: MockedObject<IHasher>;
  let tokenProvider: MockedObject<ITokenProvider>;
  let sessionRepository: MockedObject<ISessionRepository>;
  let transactionManager: MockedObject<ITransactionManager<IDbTransaction>>;
  let uuidGenerator: MockedObject<IUuidGenerator>;
  let authUsecase: AuthUsecase;

  beforeEach(() => {
    vi.clearAllMocks();
    userRepository = mockUserRepository();
    hasher = mockHasher();
    tokenProvider = mockTokenProvider();
    sessionRepository = mockSessionRepository();
    transactionManager = mockTransactionManager();
    uuidGenerator = mockUuidGenerator();
    uuidGenerator.generate.mockReturnValue(SESSION_ID);

    authUsecase = new AuthUsecase(
      userRepository,
      hasher,
      tokenProvider,
      sessionRepository,
      transactionManager,
      uuidGenerator,
    );
  });

  describe("registerAuth", () => {
    it("should register user successfully", async () => {
      userRepository.getUserByEmail.mockResolvedValue(null);
      hasher.hash.mockResolvedValueOnce(PASSWORD_HASH);

      const user = makeUser({ email: USER_EMAIL });
      uuidGenerator.generate.mockReturnValue(SESSION_ID);
      userRepository.createUser.mockResolvedValue(user);

      tokenProvider.generateToken.mockReturnValue(
        makeTokens({ refresh_token: REFRESH_TOKEN }),
      );
      hasher.hash.mockResolvedValueOnce(REFRESH_TOKEN_HASH);

      const result = await authUsecase.registerAuth({
        email: USER_EMAIL,
        password: USER_PASSWORD,
      });

      expect(transactionManager.withTransaction).toHaveBeenCalledOnce();
      expect(result.user.email).toBe(user.email);
      expect(sessionRepository.createSession).toHaveBeenCalledWith(
        expect.objectContaining({ id: SESSION_ID }),
        expect.any(Object)
      );
      expect(tokenProvider.generateToken).toHaveBeenCalledWith({
        user_id: user.id,
        session_id: SESSION_ID,
      });

      expect(userRepository.getUserByEmail).toHaveBeenCalledWith({
        email: USER_EMAIL,
      });

      expect(hasher.hash).toHaveBeenCalledWith(USER_PASSWORD);
      expect(hasher.hash).toHaveBeenCalledWith(REFRESH_TOKEN);

      expect(userRepository.createUser).toHaveBeenCalledWith(
        {
          email: USER_EMAIL,
          password_hash: PASSWORD_HASH,
        },
        expect.anything(),
      );
    });

    it("should throw if user already exists", async () => {
      userRepository.getUserByEmail.mockResolvedValue(
        makeUser({ id: "existing-user" }),
      );

      await expect(
        authUsecase.registerAuth({
          email: USER_EMAIL,
          password: USER_PASSWORD,
        }),
      ).rejects.toThrow(UserAlreadyExistsError);
    });
  });

  describe("loginAuth", () => {
    it("should login successfully", async () => {
      const user = makeUser({
        email: USER_EMAIL,
        password_hash: "stored-hash",
      });

      userRepository.getUserByEmail.mockResolvedValue(user);
      hasher.verify.mockResolvedValue(true);
      hasher.hash.mockResolvedValue(REFRESH_TOKEN_HASH);
      tokenProvider.generateToken.mockReturnValue(makeTokens());

      const result = await authUsecase.loginAuth({
        email: USER_EMAIL,
        password: USER_PASSWORD,
      });

      expect(transactionManager.withTransaction).not.toHaveBeenCalled();
      expect(result.user.email).toBe(user.email);
      expect(sessionRepository.createSession).toHaveBeenCalledWith(
        expect.objectContaining({ user_id: user.id })
      );
    });

    it("should throw if user not found", async () => {
      userRepository.getUserByEmail.mockResolvedValue(null);

      await expect(
        authUsecase.loginAuth({
          email: USER_EMAIL,
          password: USER_PASSWORD,
        }),
      ).rejects.toThrow(InvalidEmailOrPasswordError);
    });

    it("should throw if password is invalid", async () => {
      userRepository.getUserByEmail.mockResolvedValue(
        makeUser({ password_hash: "hash" }),
      );
      hasher.verify.mockResolvedValue(false);

      await expect(
        authUsecase.loginAuth({
          email: USER_EMAIL,
          password: "wrong-password",
        }),
      ).rejects.toThrow(InvalidEmailOrPasswordError);
    });
  });

  describe("logoutAuth", () => {
    it("should delete session", async () => {
      await authUsecase.logoutAuth(SESSION_ID);

      expect(sessionRepository.deleteSession).toHaveBeenCalledWith(SESSION_ID);
    });
  });

  describe("refreshToken", () => {
    it("should refresh token successfully", async () => {
      tokenProvider.verifyRefreshToken.mockReturnValue({
        user_id: USER_ID,
        session_id: SESSION_ID,
      });

      sessionRepository.getSessionById.mockResolvedValue(makeSession());

      hasher.verify.mockResolvedValue(true);

      tokenProvider.generateToken.mockReturnValue(
        makeTokens({
          access_token: NEW_ACCESS_TOKEN,
          refresh_token: NEW_REFRESH_TOKEN,
        }),
      );

      hasher.hash.mockResolvedValue("new-refresh-hash");

      const result = await authUsecase.refreshToken(REFRESH_TOKEN);

      expect(result.access_token).toBe(NEW_ACCESS_TOKEN);
      expect(sessionRepository.updateSession).toHaveBeenCalledOnce();
    });

    it("should throw if refresh token payload is invalid", async () => {
      // returning a plain string triggers typeof !== "object" → invalid payload
      tokenProvider.verifyRefreshToken.mockReturnValue("invalid");

      await expect(authUsecase.refreshToken(REFRESH_TOKEN)).rejects.toThrow(
        InvalidRefreshTokenError,
      );
    });

    it("should throw if session not found", async () => {
      tokenProvider.verifyRefreshToken.mockReturnValue({
        user_id: USER_ID,
        session_id: SESSION_ID,
      });

      sessionRepository.getSessionById.mockResolvedValue(null);

      await expect(authUsecase.refreshToken(REFRESH_TOKEN)).rejects.toThrow(
        InvalidRefreshTokenError,
      );
    });

    it("should throw if refresh token hash does not match", async () => {
      tokenProvider.verifyRefreshToken.mockReturnValue({
        user_id: USER_ID,
        session_id: SESSION_ID,
      });

      sessionRepository.getSessionById.mockResolvedValue(
        makeSession({ token_hash: "stored-hash" }),
      );

      hasher.verify.mockResolvedValue(false);

      await expect(authUsecase.refreshToken(REFRESH_TOKEN)).rejects.toThrow(
        InvalidRefreshTokenError,
      );
    });
  });
});
