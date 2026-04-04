import createHttpError from 'http-errors';

import { userRepository } from './user.repository';

import type { PublicUser } from './user.select';

class UserService {
  async getUserById(userId: string): Promise<PublicUser> {
    const user = await userRepository.findById(userId);

    if (!user) {
      throw createHttpError(404, 'User not found.');
    }

    return user;
  }

  async listUsers(): Promise<PublicUser[]> {
    return userRepository.listUsers();
  }

  async ensureUserExists(userId: string): Promise<void> {
    const userExists = await userRepository.existsById(userId);

    if (!userExists) {
      throw createHttpError(404, 'Owner user not found.');
    }
  }
}

export const userService = new UserService();
