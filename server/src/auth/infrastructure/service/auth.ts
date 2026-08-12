import { IAuthService } from "@/auth/contracts/services/auth.interface.ts";
import { ITokenProvider } from "@/auth/contracts/services/tokenProvider.interface.ts";
import { InvalidTokenError, UnauthorizedError } from "@/auth/error/errors.ts";

export class AuthService implements IAuthService {
  constructor(private readonly tokenProvider: ITokenProvider) {}

  async authenticateToken(
    accessToken: string,
  ): Promise<{ user_id: string; session_id: string }> {
    if (!accessToken) {
      throw new UnauthorizedError();
    }

    const decoded = this.tokenProvider.verifyAccessToken(accessToken);

    if (!decoded) {
      throw new InvalidTokenError();
    }

    return { user_id: decoded.user_id, session_id: decoded.session_id };
  }
}
