import { prisma } from '../../config/prisma';
import { publicUserSelect, type PublicUser } from '../user/user.select';

import type { Prisma, RefreshToken, User } from '@prisma/client';

const authUserSelect = {
  id: true,
  email: true,
  name: true,
  passwordHash: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

type AuthUserRecord = Prisma.UserGetPayload<{
  select: typeof authUserSelect;
}>;

type RefreshTokenRecord = Prisma.RefreshTokenGetPayload<{
  include: {
    user: {
      select: typeof publicUserSelect;
    };
  };
}>;

class AuthRepository {
  async createUser(data: Pick<User, 'email' | 'name' | 'passwordHash'>): Promise<PublicUser> {
    return prisma.user.create({
      data,
      select: publicUserSelect,
    });
  }

  async findUserByEmail(email: string): Promise<AuthUserRecord | null> {
    return prisma.user.findUnique({
      select: authUserSelect,
      where: {
        email,
      },
    });
  }

  async findPublicUserById(userId: string): Promise<PublicUser | null> {
    return prisma.user.findUnique({
      select: publicUserSelect,
      where: {
        id: userId,
      },
    });
  }

  async createRefreshToken(
    data: Pick<RefreshToken, 'id' | 'tokenHash' | 'userId' | 'expiresAt'>,
  ): Promise<void> {
    await prisma.refreshToken.create({
      data,
    });
  }

  async findRefreshTokenById(tokenId: string): Promise<RefreshTokenRecord | null> {
    return prisma.refreshToken.findUnique({
      where: {
        id: tokenId,
      },
      include: {
        user: {
          select: publicUserSelect,
        },
      },
    });
  }

  async rotateRefreshToken(
    currentTokenId: string,
    nextToken: Pick<RefreshToken, 'id' | 'tokenHash' | 'userId' | 'expiresAt'>,
  ): Promise<void> {
    await prisma.$transaction([
      prisma.refreshToken.create({
        data: nextToken,
      }),
      prisma.refreshToken.update({
        where: {
          id: currentTokenId,
        },
        data: {
          revokedAt: new Date(),
          replacedByTokenId: nextToken.id,
        },
      }),
    ]);
  }
}

export const authRepository = new AuthRepository();
