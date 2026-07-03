import { db } from '@/db';
import { users } from '@/db/schema/users';
import { eq, and, lt } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { ConflictError, UnauthorizedError } from '@/core/errors';
import { RegisterInput, LoginInput, DriverRegisterInput } from './auth.validation';
import { passwordResetTokens } from '@/db/schema/passwordResetTokens';
import { sendPasswordResetEmail } from '@/core/email';

export class AuthService {
  static async register(input: RegisterInput) {
    try {
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.email, input.email));

      if (existingUser) {
        throw new ConflictError('Email is already registered');
      }

      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(input.password, saltRounds);

      const [newUser] = await db
        .insert(users)
        .values({
          name: input.name,
          email: input.email,
          countryCode: input.countryCode,
          localPhone: input.localPhone,
          passwordHash,
          authProvider: 'local',
          accountStatus: 'active',
          role: 'customer',
        })
        .returning();

      const { passwordHash: _, ...safeUser } = newUser;
      return safeUser;
    } catch (error: any) {
      throw error;
    }
  }

  static async login(input: LoginInput) {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, input.email));

    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    if (user.authProvider !== 'local' || !user.passwordHash) {
      throw new UnauthorizedError(
        `Please login using your ${user.authProvider} account`
      );
    }

    if (user.accountStatus !== 'active') {
      throw new UnauthorizedError(
        'Account is not active. Please contact support.'
      );
    }

    const passwordValid = await bcrypt.compare(
      input.password,
      user.passwordHash
    );

    if (!passwordValid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const { passwordHash: _, ...safeUser } = user;
    return safeUser;
  }

  static async googleOAuth(input: {
    googleId: string;
    email: string;
    name: string;
  }) {
    let [user] = await db
      .select()
      .from(users)
      .where(eq(users.googleId, input.googleId));

    if (user) {
      const { passwordHash: _, ...safeUser } = user;
      return safeUser;
    }

    // Email already registered with a different provider
    const [existing] = await db
      .select()
      .from(users)
      .where(eq(users.email, input.email));

    if (existing && existing.authProvider !== 'google') {
      throw new ConflictError(
        `Email is already registered via ${existing.authProvider}`
      );
    }

    const [newUser] = await db
      .insert(users)
      .values({
        name: input.name,
        email: input.email,
        googleId: input.googleId,
        authProvider: 'google',
        accountStatus: 'active',
      })
      .returning();

    const { passwordHash: _, ...safeUser } = newUser;
    return safeUser;
  }

  static async forgotPassword(email: string) {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    if (!user) {
      return; // Don't reveal whether the email exists
    }
    if (user.authProvider !== 'local') {
      return; // Don't allow password reset for non-local accounts
    }

    await db
      .delete(passwordResetTokens)
      .where(eq(passwordResetTokens.userId, user.id));

    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await db
      .insert(passwordResetTokens)
      .values({ userId: user.id, tokenHash, expiresAt });

    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
    await sendPasswordResetEmail(user.email, resetLink);
  }

  static async resetPassword(token: string, newPassword: string) {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const [resetToken] = await db
      .select()
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.tokenHash, tokenHash));

    if (!resetToken || resetToken.expiresAt < new Date()) {
      if (resetToken) {
        await db
          .delete(passwordResetTokens)
          .where(eq(passwordResetTokens.id, resetToken.id));
      }
      throw new UnauthorizedError('Invalid or expired password reset token');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await db
      .update(users)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(users.id, resetToken.userId));

    // Invalid the token after use
    await db
      .delete(passwordResetTokens)
      .where(eq(passwordResetTokens.id, resetToken.id));
  }

  static async driverRegister(input: DriverRegisterInput) {
    try {
      const [existingDriver] = await db.select().from(users).where(eq(users.email, input.email));

      if (existingDriver) {
        throw new ConflictError('Email is already registered');
      }

      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(input.password, saltRounds);

      // Calculate years of experience as years.

      const [newDriver] = await db.insert(users).values({
        name: input.name,
        email: input.email,
        countryCode: input.countryCode,
        localPhone: input.localPhone,
        passwordHash,
        licenseNumber: input.licenseNumber,
        licenseIssueDate: input.licenseIssueDate,
        licenseExpiryDate: input.licenseExpiryDate,
        authProvider: 'local',
        accountStatus: 'deactivated',
        role: 'driver',
      }).returning();
 
      const { passwordHash: _, ...safeDriver } = newDriver;
      return safeDriver;
    } catch (error: any) {
      throw error;
    }
  }
}
