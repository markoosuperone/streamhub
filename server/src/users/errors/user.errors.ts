import { CustomError } from "@/shared/error/error.ts";

const UserErrors = {
  USER_NOT_FOUND: "User not found",
} as const;

export class UserNotFoundError extends CustomError {
  constructor() {
    super(UserErrors.USER_NOT_FOUND, 404);
    this.name = "UserNotFoundError";
  }
}
