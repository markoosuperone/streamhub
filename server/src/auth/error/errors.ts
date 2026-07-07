import { CustomError } from "@/shared/error/error.ts";

const AuthErrors = {
  USER_ALREADY_EXISTS: "User with this email already exists",
  INVALID_EMAIL_OR_PASSWORD: "Invalid email or password",
  INVALID_REFRESH_TOKEN: "Invalid refresh token",
  HASH_PASSWORD_ERROR: "Error hashing password",
  CREATE_USER_ERROR: "Error creating user",
  GENERATE_TOKENS_ERROR: "Error generating tokens",
  SAVE_SESSION_ERROR: "Error saving session",
  GET_SESSION_RECORD_ERROR: "Failed to get session record",
  GET_USER_RECORD_ERROR: "Failed to get user record",
  UPDATE_SESSION_ERROR: "Error updating session",
  VERIFY_TOKEN_ERROR: "Error verifying token",
  DELETE_SESSION_ERROR: "Error deleting session",
  INVALID_SESSION_ID_ERROR: "Invalid session id",
  UNAUTHORIZED: "Unauthorized",
  INVALID_AUTHORIZATION_HEADER: "Invalid authorization header",
  INVALID_TOKEN: "Invalid token",
  INVALID_TOKEN_PAYLOAD: "Invalid token payload",
  USER_ID_NOT_FOUND_IN_TOKEN_PAYLOAD: "User id not found in token payload",
} as const;

export class CredentialErrors extends CustomError {
  constructor(statusCode: number = 409) {
    super(AuthErrors.USER_ALREADY_EXISTS, statusCode);
  }
}
export class InvalidEmailOrPasswordError extends CustomError {
  constructor(statusCode: number = 401) {
    super(AuthErrors.INVALID_EMAIL_OR_PASSWORD, statusCode);
  }
}
export class InvalidRefreshTokenError extends CustomError {
  constructor(statusCode: number = 401) {
    super(AuthErrors.INVALID_REFRESH_TOKEN, statusCode);
  }
}
export class VerifyTokenError extends CustomError {
  constructor(statusCode: number = 401) {
    super(AuthErrors.VERIFY_TOKEN_ERROR, statusCode);
  }
}
export class HashPasswordError extends CustomError {
  constructor(statusCode: number = 500) {
    super(AuthErrors.HASH_PASSWORD_ERROR, statusCode);
  }
}
export class CreateUserError extends CustomError {
  constructor(statusCode: number = 500) {
    super(AuthErrors.CREATE_USER_ERROR, statusCode);
  }
}
export class CreateSessionError extends CustomError {
  constructor(statusCode: number = 500) {
    super(AuthErrors.SAVE_SESSION_ERROR, statusCode);
  }
}
export class GetSessionRecordError extends CustomError {
  constructor(statusCode: number = 500) {
    super(AuthErrors.GET_SESSION_RECORD_ERROR, statusCode);
    this.name = "GetSessionRecordError";
  }
}
export class GetUserRecordError extends CustomError {
  constructor(statusCode: number = 500) {
    super(AuthErrors.GET_USER_RECORD_ERROR, statusCode);
    this.name = "GetUserRecordError";
  }
}
export class GenerateTokensError extends CustomError {
  constructor(statusCode: number = 500) {
    super(AuthErrors.GENERATE_TOKENS_ERROR, statusCode);
  }
}
export class UpdateSessionError extends CustomError {
  constructor(statusCode: number = 500) {
    super(AuthErrors.UPDATE_SESSION_ERROR, statusCode);
  }
}
export class UserAlreadyExistsError extends CustomError {
  constructor(statusCode: number = 409) {
    super(AuthErrors.USER_ALREADY_EXISTS, statusCode);
  }
}
export class DeleteSessionError extends CustomError {
  constructor(statusCode: number = 500) {
    super(AuthErrors.DELETE_SESSION_ERROR, statusCode);
  }
}

export class InvalidSessionIdError extends CustomError {
  constructor(statusCode: number = 401) {
    super(AuthErrors.INVALID_SESSION_ID_ERROR, statusCode);
  }
}
export class InvalidAuthorizationHeaderError extends CustomError {
  constructor(statusCode: number = 401) {
    super(AuthErrors.INVALID_AUTHORIZATION_HEADER, statusCode);
  }
}
export class InvalidTokenError extends CustomError {
  constructor(statusCode: number = 401) {
    super(AuthErrors.INVALID_TOKEN, statusCode);
  }
}
export class InvalidTokenPayloadError extends CustomError {
  constructor(statusCode: number = 401) {
    super(AuthErrors.INVALID_TOKEN_PAYLOAD, statusCode);
  }
}
export class UserIdNotFoundInTokenPayloadError extends CustomError {
  constructor(statusCode: number = 401) {
    super(AuthErrors.USER_ID_NOT_FOUND_IN_TOKEN_PAYLOAD, statusCode);
  }
}
export class UnauthorizedError extends CustomError {
  constructor(statusCode: number = 401) {
    super(AuthErrors.UNAUTHORIZED, statusCode);
  }
} 