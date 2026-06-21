import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  vi,
} from 'vitest';
import { db } from '@/db';
import { users } from '@/db/schema/users';
import { passwordResetTokens } from '@/db/schema/passwordResetTokens';
import { AuthService } from './auth.service';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { buildApp } from '@/app';
import { FastifyInstance } from 'fastify';
import { UnauthorizedError } from '@/core/errors';

vi.mock('@/core/email', () => ({
  sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
}));

import { sendPasswordResetEmail } from '@/core/email';
import { Resend } from 'resend';
import { link } from 'fs';
import { resetPasswordSchema } from './auth.validation';

const BASE_USER = {
  name: 'Reset Test User',
  email: 'passwordreset@example.com',
  password: 'OriginalPassword123!',
  countryCode: '+1',
  localPhone: '1234567890',
};

describe('AuthService - Forgot & Reset Password ', () => {
  let userId: string;

  beforeAll(async () => {
    const passwordHash = await bcrypt.hash(BASE_USER.password, 10);
    const [user] = await db
      .insert(users)
      .values({
        name: BASE_USER.name,
        email: BASE_USER.email,
        countryCode: BASE_USER.countryCode,
        localPhone: BASE_USER.localPhone,
        passwordHash,
        authProvider: 'local',
        accountStatus: 'active',
      })
      .returning();
    userId = user.id;
  }, 15000);

  afterAll(async () => {
    await db
      .delete(passwordResetTokens)
      .where(eq(passwordResetTokens.userId, userId));
    await db.delete(users).where(eq(users.id, userId));
  });

  //---- AuthService.forgotPassword() ----//
  describe('Authservice - forgotPassword', () => {
    beforeEach(async () => {
      vi.clearAllMocks();
      await db
        .delete(passwordResetTokens)
        .where(eq(passwordResetTokens.userId, userId));
    });

    it('should insert exactly one token row in the DB for a valid local user', async () => {
      await AuthService.forgotPassword(BASE_USER.email);

      const tokens = await db
        .select()
        .from(passwordResetTokens)
        .where(eq(passwordResetTokens.userId, userId));
      expect(tokens).toHaveLength(1);
    });

    it('should set token expiry to approximately 1 hour from now', async () => {
      const before = Date.now();
      await AuthService.forgotPassword(BASE_USER.email);
      const after = Date.now();

      const [token] = await db
        .select()
        .from(passwordResetTokens)
        .where(eq(passwordResetTokens.userId, userId));
      const oneHour = 60 * 60 * 1000;
      expect(token.expiresAt.getTime()).toBeGreaterThanOrEqual(
        before + oneHour - 1000
      );
      expect(token.expiresAt.getTime()).toBeLessThanOrEqual(
        after + oneHour + 1000
      );
    });

    it('should store a SHA-256 hash of the token, not the raw token', async () => {
      await AuthService.forgotPassword(BASE_USER.email);

      const resetLink = vi.mocked(sendPasswordResetEmail).mock.calls[0][1];
      const rawToken = new URL(resetLink).searchParams.get('token')!;
      const expectedHash = crypto
        .createHash('sha256')
        .update(rawToken)
        .digest('hex');

      const [tokenRecord] = await db
        .select()
        .from(passwordResetTokens)
        .where(eq(passwordResetTokens.userId, userId));

      expect(tokenRecord.tokenHash).toBe(expectedHash);
      expect(tokenRecord.tokenHash).not.toBe(rawToken);
    });

    it('should call sendPasswordResetEmail with correct parameters', async () => {
      await AuthService.forgotPassword(BASE_USER.email);

      const mockedSend = vi.mocked(sendPasswordResetEmail);
      expect(mockedSend).toHaveBeenCalledOnce();

      const [toArg, linkArg] = mockedSend.mock.calls[0];
      expect(toArg).toBe(BASE_USER.email);
      expect(linkArg).toContain('token=');
    });

    it('should replace the old token when called again - only one token per user', async () => {
      await AuthService.forgotPassword(BASE_USER.email);
      const [first] = await db
        .select()
        .from(passwordResetTokens)
        .where(eq(passwordResetTokens.userId, userId));

      await AuthService.forgotPassword(BASE_USER.email);
      const tokens = await db
        .select()
        .from(passwordResetTokens)
        .where(eq(passwordResetTokens.userId, userId));

      expect(tokens).toHaveLength(1);
      expect(tokens[0].id).not.toBe(first.id);
    });

    it('should return undefined silently if email does not exist (to prevent enumeration', async () => {
      await expect(
        AuthService.forgotPassword('ghost@example.com')
      ).resolves.toBeUndefined();

      expect(vi.mocked(sendPasswordResetEmail)).not.toHaveBeenCalled();
    });

    it('should return undefined silently if user is not local auth provider', async () => {
      const [googleUser] = await db
        .insert(users)
        .values({
          name: 'Google User',
          email: 'googleuser@example.com',
          googleId: 'google-123',
          authProvider: 'google',
          accountStatus: 'active',
        })
        .returning();

      try {
        await expect(
          AuthService.forgotPassword(googleUser.email)
        ).resolves.toBeUndefined();

        expect(vi.mocked(sendPasswordResetEmail)).not.toHaveBeenCalled();
      } finally {
        await db.delete(users).where(eq(users.id, googleUser.id));
      }
    });
  });

  // --- AuthService.resetPassword() ---
  describe('AuthService - resetPassword() error cases', async () => {
    beforeEach(async () => {
      vi.clearAllMocks();
      await db
        .delete(passwordResetTokens)
        .where(eq(passwordResetTokens.userId, userId));
    });

    it('should throw UnauthorizedError for a token that does not exist', async () => {
      await expect(
        AuthService.resetPassword('a'.repeat(64), 'AnyPass123!')
      ).rejects.toThrow(UnauthorizedError);
    });

    it('should throw UnauthorizedError for an expired token', async () => {
      const expiredRaw = crypto.randomBytes(32).toString('hex');
      const expriredHash = crypto
        .createHash('sha256')
        .update(expiredRaw)
        .digest('hex');

      await db.insert(passwordResetTokens).values({
        userId,
        tokenHash: expriredHash,
        expiresAt: new Date(Date.now() - 60 * 60 * 1000),
      });

      await expect(
        AuthService.resetPassword(expiredRaw, 'AnynewPass123!')
      ).rejects.toThrow(UnauthorizedError);
    });

    it('should delete the expired token from the database after rejection', async () => {
      const expiredRaw = crypto.randomBytes(32).toString('hex');
      const expiredHash = crypto
        .createHash('sha256')
        .update(expiredRaw)
        .digest('hex');

      await db.insert(passwordResetTokens).values({
        userId,
        tokenHash: expiredHash,
        expiresAt: new Date(Date.now() - 60 * 60 * 1000),
      });

      await AuthService.resetPassword(expiredRaw, 'AnyPass123!').catch(
        () => {}
      );

      const remaining = await db
        .select()
        .from(passwordResetTokens)
        .where(eq(passwordResetTokens.userId, userId));
      expect(remaining).toHaveLength(0);
    });

    it('should not change the password when the token is expired', async () => {
      const expiredRaw = crypto.randomBytes(32).toString('hex');
      const expiredHash = crypto
        .createHash('sha256')
        .update(expiredRaw)
        .digest('hex');

      await db.insert(passwordResetTokens).values({
        userId,
        tokenHash: expiredHash,
        expiresAt: new Date(Date.now() - 60 * 60 * 1000),
      });

      await AuthService.resetPassword(expiredRaw, 'ShouldNoWord123!0').catch(
        () => {}
      );

      const [userRecord] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId));
      const stillOriginal = await bcrypt.compare(
        BASE_USER.password,
        userRecord.passwordHash!
      );
      expect(stillOriginal).toBe(true);
    });
  });

  // --- AuthSercice.resetPassword() ---
  describe('AuthService - resetPassword()', () => {
    let rawToken: string;
    let newPassword = 'NewSecurePass123!';

    beforeEach(async () => {
      vi.clearAllMocks();
      const passwordHash = await bcrypt.hash(BASE_USER.password, 10);
      await db.update(users).set({ passwordHash }).where(eq(users.id, userId));
      await db
        .delete(passwordResetTokens)
        .where(eq(passwordResetTokens.userId, userId));

      await AuthService.forgotPassword(BASE_USER.email);
      const resetLink = vi.mocked(sendPasswordResetEmail).mock.calls[0][1];
      rawToken = new URL(resetLink).searchParams.get('token')!;
    }, 15000);

    it('should update the user passwordHash on a valid token', async () => {
      await AuthService.resetPassword(rawToken, newPassword);

      const [userRecord] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId));
      const isUpdated = await bcrypt.compare(
        newPassword,
        userRecord.passwordHash!
      );

      expect(isUpdated).toBe(true);
    });

    it('should delete the token from the database after successful reset', async () => {
      await AuthService.resetPassword(rawToken, newPassword);

      const tokens = await db
        .select()
        .from(passwordResetTokens)
        .where(eq(passwordResetTokens.userId, userId));
      expect(tokens).toHaveLength(0);
    });

    it('should not allow reuse of the same token', async () => {
      await AuthService.resetPassword(rawToken, newPassword);

      await expect(
        AuthService.resetPassword(rawToken, 'AnotherPass123!')
      ).rejects.toThrow(UnauthorizedError);
    });

    it('should allow login with the new password', async () => {
      await AuthService.resetPassword(rawToken, newPassword);
      const result = await AuthService.login({
        email: BASE_USER.email,
        password: newPassword,
      });
      expect(result.email).toBe(BASE_USER.email);
    });

    it('should reject login with the old password after reset', async () => {
      await AuthService.resetPassword(rawToken, newPassword);
      await expect(
        AuthService.login({
          email: BASE_USER.email,
          password: BASE_USER.password,
        })
      ).rejects.toThrow(UnauthorizedError);
    });
  });

  // --- HTTP Routes --- //
  describe('Auth Routes - /api/v1/auth', () => {
    let app: FastifyInstance;
    let serverUrl: string;

    beforeAll(async () => {
      app = buildApp();
      await app.listen({ port: 0, host: '127.0.0.1' });
      const address = app.server.address();
      if (typeof address === 'string' || !address) {
        throw new Error('Failed to get server address');
      }
      serverUrl = `http://${address.address}:${address.port}`;
    }, 15000);

    afterAll(async () => {
      await app.close();
    });

    beforeEach(async () => {
      vi.clearAllMocks();
      await db
        .delete(passwordResetTokens)
        .where(eq(passwordResetTokens.userId, userId));
    });

    // POST forgot password
    it('POST /forgot-password with a valid email should return 200', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/forgot-password',
        payload: { email: BASE_USER.email },
      });
      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
    });

    it('POST /forgot-password with an invalid email should still return 200', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/forgot-password',
        payload: { email: 'somerandom@example.com' },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
    });

    it('POST /forgot-password should return 400 if email is missing', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/forgot-password',
        payload: {},
      });

      expect(response.statusCode).toBe(400);
    });

    it('POST /forgot-password with invalid email format should return 400', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/forgot-password',
        payload: { email: 'abcdefgh' },
      });
      expect(response.statusCode).toBe(400);
    });

    // POST reset-password
    it('POST /reset-password with valid token should return 200', async () => {
      const passwordHash = await bcrypt.hash(BASE_USER.password, 10);
      await db.update(users).set({ passwordHash }).where(eq(users.id, userId));

      await AuthService.forgotPassword(BASE_USER.email);
      const resetLink = vi.mocked(sendPasswordResetEmail).mock.calls[0][1];
      const token = new URL(resetLink).searchParams.get('token');

      const response = await fetch(`${serverUrl}/api/v1/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: 'NewPassword123!' }),
      });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
    });

    it('POST /reset-password with invalid token should return 401', async () => {
        const response = await fetch(`${serverUrl}/api/v1/auth/reset-password`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({token:'a'.repeat(64), newPassword: 'NewPassword123!' })
        })
        expect(response.status).toBe(401);
    })

    it('POST /reset-password missing new password should return 400', async () => {
        await AuthService.forgotPassword(BASE_USER.email);
        const resetLink = vi.mocked(sendPasswordResetEmail).mock.calls[0][1];
        const token = new URL(resetLink).searchParams.get('token');

        const response = await fetch(`${serverUrl}/api/v1/auth/reset-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json'},
            body: JSON.stringify({ token })
        })

        expect(response.status).toBe(400);
    })

    it('POST /reset-password with password shorter than 8 should return 400', async () => {
        await AuthService.forgotPassword(BASE_USER.email);

        const resetLink = vi.mocked(sendPasswordResetEmail).mock.calls[0][1];
        const token = new URL(resetLink).searchParams.get('token');

        const response = await fetch(`${serverUrl}/api/v1/auth/reset-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json'},
            body: JSON.stringify({token, newPassword: 'Hello1!'})
        })

        expect(response.status).toBe(400);
    } )
  });
});
