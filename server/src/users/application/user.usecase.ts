import { PaginatedResponse, UserDTO } from "@superplayer/contracts";
import { IUserRepository } from "@/users/repository/user.repository.ts";
import { UserNotFoundError } from "@/users/errors/user.errors.ts";

export interface IUserUsecase {
  getUser(id: string): Promise<UserDTO>;
  getAllUsers(
    limit: number,
    offset: number,
  ): Promise<PaginatedResponse<UserDTO>>;
}

export class UserUsecase implements IUserUsecase {
  constructor(private readonly userRepository: IUserRepository) {}

  async getUser(id: string): Promise<UserDTO> {
    const user = await this.userRepository.getUserById({ id });
    if (!user) {
      throw new UserNotFoundError();
    }
    return { user_id: user.id, email: user.email };
  }

  async getAllUsers(
    limit: number,
    offset: number,
  ): Promise<PaginatedResponse<UserDTO>> {
    const { items, total } = await this.userRepository.getAllUsers(
      limit,
      offset,
    );
    return { items, total, limit, offset };
  }
}
