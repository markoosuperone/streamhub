import { isAccessTokenPayload, ITokenProvider } from "@/auth/contracts/services/tokenProvider.interface.ts";
import { TokenPayloadDTO } from "@/auth/dto/auth.dto.ts";
import { GenerateTokensError, InvalidRefreshTokenError, InvalidTokenError, InvalidTokenPayloadError } from "@/auth/error/errors.ts";
import env from "@/config/env.ts";
import jwt, { JwtPayload } from "jsonwebtoken";

type AccessTokenPayload = JwtPayload & {
  user_id: string;
  session_id: string;
};

export class TokenProvider implements ITokenProvider {
  generateToken(payload: TokenPayloadDTO) {
    try {
    const now = new Date();

    const access_expiresIn = env.jwt.access_expiresIn;
    const refresh_expiresIn = env.jwt.refresh_expiresIn;
    const access_options = {
      expiresIn: access_expiresIn,
    };
    const refresh_options = {
      expiresIn: refresh_expiresIn,
    };
    const second = 1000;
    const jwtAccessTokenSecret = env.jwt.access_secret;
    const jwtRefreshTokenSecret = env.jwt.refresh_secret;
    const access_token = jwt.sign(
      payload,
      jwtAccessTokenSecret,
      access_options
    );
    const refresh_token = jwt.sign(
      payload,
      jwtRefreshTokenSecret,
      refresh_options
    );
    const access_token_expires_at = new Date(
      now.getTime() + access_expiresIn * second
    );
    const refresh_token_expires_at = new Date(
      now.getTime() + refresh_expiresIn * second
    );
    return {
      access_token,
      refresh_token,
      access_token_expires_at,
        refresh_token_expires_at,
      };
    } catch {
      throw new GenerateTokensError();
    }
  }
  verifyAccessToken(token: string): AccessTokenPayload {
    try {
      const jwtAccessTokenSecret = env.jwt.access_secret;
      const decoded = jwt.verify(token, jwtAccessTokenSecret);
      
      if (!isAccessTokenPayload(decoded)) {
        throw new InvalidTokenPayloadError();
      }

      return decoded;

    } catch {
      throw new InvalidTokenError();
    }
  }
  verifyRefreshToken(token: string): JwtPayload | string {
    try {
      const jwtRefreshTokenSecret = env.jwt.refresh_secret;
      const decoded = jwt.verify(token, jwtRefreshTokenSecret);
      return decoded;
    } catch {
      throw new InvalidRefreshTokenError();
    }
  }
}
