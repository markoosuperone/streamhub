/**
 * User domain entity
 * Represents the core business entity in the domain layer
 */
export interface IUser {
  id: string;
  email: string;
  password_hash: string;
  created_at: Date;
  updated_at: Date;
}
