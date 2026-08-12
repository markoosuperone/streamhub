export interface IAuthService {
  authenticateToken(accessToken: string): Promise<{
    user_id: string;
    session_id: string;
  }>;
}
