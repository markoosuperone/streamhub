import { TokenPairDTO } from "@superplayer/contracts";
import { TokenPayloadDTO } from "@/auth/dto/auth.dto.ts";
import { JwtPayload } from "jsonwebtoken";

type AccessTokenPayload = JwtPayload & {
  user_id: string;
  session_id: string;
};

export interface ITokenProvider {
  generateToken: (payload: TokenPayloadDTO) => TokenPairDTO;
  verifyAccessToken: (token: string) => AccessTokenPayload;
  verifyRefreshToken: (token: string) => JwtPayload | string;
}
export function isAccessTokenPayload(
  decoded: unknown
): decoded is AccessTokenPayload {
  return (
    typeof decoded === "object" &&
    decoded !== null &&
    "user_id" in decoded &&
    typeof (decoded as AccessTokenPayload)["user_id"] === "string" &&
    "session_id" in decoded &&
    typeof (decoded as AccessTokenPayload)["session_id"] === "string"
  );
}
