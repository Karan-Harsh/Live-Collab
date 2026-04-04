import createHttpError from 'http-errors';

import { authRepository } from './auth.repository';
import {
  generateTokenPair,
  getRefreshTokenExpiryDate,
  hashPassword,
  hashRefreshToken,
  verifyPassword,
  verifyRefreshToken,
} from './auth.utils';

import type { AuthResponseData, LoginDto, RefreshDto, SignupDto } from './auth.types';
import type { PublicUser } from '../user/user.select';

class AuthService {
  async signup(input: SignupDto): Promise<AuthResponseData> {
    const existingUser = await authRepository.findUserByEmail(input.email);

    if (existingUser) {
      throw createHttpError(409, 'A user with this email already exists.');
    }

    const passwordHash = await hashPassword(input.password);
    const user = await authRepository.createUser({
      email: input.email,
      name: input.name,
      passwordHash,
    });

    return this.issueTokens(user);
  }

  async login(input: LoginDto): Promise<AuthResponseData> {
    const user = await authRepository.findUserByEmail(input.email);

    if (!user) {
      throw createHttpError(401, 'Invalid email or password.');
    }

    const passwordMatches = await verifyPassword(input.password, user.passwordHash);

    if (!passwordMatches) {
      throw createHttpError(401, 'Invalid email or password.');
    }

    return this.issueTokens({
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  }

  async refresh(input: RefreshDto): Promise<AuthResponseData> {
    let payload;

    try {
      payload = verifyRefreshToken(input.refreshToken);
    } catch {
      throw createHttpError(401, 'Invalid refresh token.');
    }

    const storedToken = await authRepository.findRefreshTokenById(payload.tokenId);

    if (!storedToken || storedToken.userId !== payload.sub) {
      throw createHttpError(401, 'Invalid refresh token.');
    }

    if (storedToken.revokedAt || storedToken.expiresAt <= new Date()) {
      throw createHttpError(401, 'Refresh token is expired or revoked.');
    }

    const providedTokenHash = hashRefreshToken(input.refreshToken);

    if (storedToken.tokenHash !== providedTokenHash) {
      throw createHttpError(401, 'Invalid refresh token.');
    }

    const nextTokens = generateTokenPair(storedToken.user.id, storedToken.user.email);

    await authRepository.rotateRefreshToken(storedToken.id, {
      id: nextTokens.tokenId,
      tokenHash: hashRefreshToken(nextTokens.refreshToken),
      userId: storedToken.user.id,
      expiresAt: getRefreshTokenExpiryDate(),
    });

    return {
      user: storedToken.user,
      accessToken: nextTokens.accessToken,
      refreshToken: nextTokens.refreshToken,
    };
  }

  async getCurrentUser(userId: string): Promise<PublicUser> {
    const user = await authRepository.findPublicUserById(userId);

    if (!user) {
      throw createHttpError(401, 'Authenticated user no longer exists.');
    }

    return user;
  }

  private async issueTokens(user: PublicUser): Promise<AuthResponseData> {
    const tokens = generateTokenPair(user.id, user.email);

    await authRepository.createRefreshToken({
      id: tokens.tokenId,
      tokenHash: hashRefreshToken(tokens.refreshToken),
      userId: user.id,
      expiresAt: getRefreshTokenExpiryDate(),
    });

    return {
      user,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }
}

export const authService = new AuthService();
