
export interface IAuthService {
  authenticate(authorizationHeader: string): Promise<{
    user_id: string;
    session_id: string;
  }>;
}
