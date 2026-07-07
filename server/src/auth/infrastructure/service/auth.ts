import { IAuthService } from "@/auth/contracts/services/auth.interface.ts";
import { ITokenProvider } from "@/auth/contracts/services/tokenProvider.interface.ts";
import {
  InvalidAuthorizationHeaderError,
  InvalidTokenError,
  UnauthorizedError,
} from "@/auth/error/errors.ts";

export class AuthService implements IAuthService {
  constructor(private readonly tokenProvider: ITokenProvider) {}

  async authenticate(
    authorizationHeader: string
  ): Promise<{ user_id: string; session_id: string }> {
    if (!authorizationHeader) {
      throw new UnauthorizedError();
    }

    const [scheme, token] = authorizationHeader.split(" ");

    if (scheme !== "Bearer" || !token) {
      throw new InvalidAuthorizationHeaderError();
    }

    const decoded = this.tokenProvider.verifyAccessToken(token);

    if (!decoded) {
      throw new InvalidTokenError();
    }

    return { user_id: decoded.user_id, session_id: decoded.session_id };
  }
}
