import { describe, expect, it } from 'vitest';

import {
  createAccessToken,
  createRefreshToken,
  hashPassword,
  hashRefreshToken,
  verifyAccessToken,
  verifyPassword,
  verifyRefreshToken,
} from '../../../src/modules/auth/auth.utils';

describe('auth utils', () => {
  it('hashes and verifies passwords', async () => {
    const password = 'StrongPassword123!';
    const passwordHash = await hashPassword(password);

    await expect(verifyPassword(password, passwordHash)).resolves.toBe(true);
    await expect(verifyPassword('WrongPassword123!', passwordHash)).resolves.toBe(false);
  });

  it('hashes refresh tokens deterministically', () => {
    const refreshToken = 'refresh-token-value';

    expect(hashRefreshToken(refreshToken)).toBe(hashRefreshToken(refreshToken));
    expect(hashRefreshToken(refreshToken)).not.toBe(hashRefreshToken('different-token-value'));
  });

  it('creates and verifies access and refresh jwt tokens', () => {
    const accessToken = createAccessToken('user-id', 'user@example.com');
    const refreshToken = createRefreshToken('user-id', 'token-id');

    expect(verifyAccessToken(accessToken)).toMatchObject({
      sub: 'user-id',
      email: 'user@example.com',
      type: 'access',
    });

    expect(verifyRefreshToken(refreshToken)).toMatchObject({
      sub: 'user-id',
      tokenId: 'token-id',
      type: 'refresh',
    });
  });
});
