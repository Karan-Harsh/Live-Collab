import { publicUserSelect, type PublicUser } from './user.select';
import { prisma } from '../../config/prisma';

class UserRepository {
  async findById(userId: string): Promise<PublicUser | null> {
    return prisma.user.findUnique({
      select: publicUserSelect,
      where: {
        id: userId,
      },
    });
  }

  async existsById(userId: string): Promise<boolean> {
    const count = await prisma.user.count({
      where: {
        id: userId,
      },
    });

    return count > 0;
  }

  async listUsers(): Promise<PublicUser[]> {
    return prisma.user.findMany({
      select: publicUserSelect,
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}

export const userRepository = new UserRepository();
