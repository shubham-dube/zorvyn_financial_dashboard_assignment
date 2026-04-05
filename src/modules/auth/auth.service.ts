import { PrismaClient, User } from '@prisma/client';
import * as argon2 from 'argon2';
import { randomBytes } from 'crypto';
import { CONSTANTS } from '../../config/constants.js';
import { tokenStore } from '../../lib/redis/tokenStore.js';
import { ConflictError, UnauthorizedError, ForbiddenError } from '../../lib/errors/AppError.js';
import { RegisterInput, LoginInput } from './auth.schema.js';
import { AuthResponse, AuthTokens, UserProfile } from './auth.types.js';
import { Role, RequestUser } from '../../types/common.types.js';

export class AuthService {
  constructor(
    private prisma: PrismaClient,
    private jwtSign: (payload: object) => string
  ) {}

  async register(input: RegisterInput): Promise<AuthResponse> {
    // Check if user already exists
    const existing = await this.prisma.user.findUnique({
      where: { email: input.email },
    });

    if (existing) {
      throw new ConflictError('Email already registered');
    }

    // Hash password with Argon2id
    const passwordHash = await argon2.hash(input.password, {
      type: argon2.argon2id,
      memoryCost: CONSTANTS.ARGON2.MEMORY_COST,
      timeCost: CONSTANTS.ARGON2.TIME_COST,
      parallelism: CONSTANTS.ARGON2.PARALLELISM,
    });

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email: input.email,
        name: input.name,
        passwordHash,
        role: Role.VIEWER, // Default role
      },
    });

    // Generate tokens
    const tokens = await this.generateTokens(user);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role as Role,
      },
      tokens,
    };
  }

  async login(input: LoginInput, ipAddress?: string, userAgent?: string): Promise<AuthResponse> {
    // Find user
    const user = await this.prisma.user.findUnique({
      where: { email: input.email },
    });

    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Verify password
    const isValid = await argon2.verify(user.passwordHash, input.password);

    if (!isValid) {
      // Log failed attempt
      const auditData = {
        userId: user.id,
        action: CONSTANTS.AUDIT_ACTIONS.USER_LOGIN_FAILED,
        resource: 'user',
        resourceId: user.id,
        ...(typeof ipAddress === 'string' ? { ipAddress } : {}),
        ...(typeof userAgent === 'string' ? { userAgent } : {}),
      };

      await this.prisma.auditLog.create({
        data: auditData,
      });

      throw new UnauthorizedError('Invalid email or password');
    }

    // Check if user is active
    if (user.status !== 'ACTIVE') {
      throw new ForbiddenError('Account is not active');
    }

    // Log successful login
    const auditData = {
      userId: user.id,
      action: CONSTANTS.AUDIT_ACTIONS.USER_LOGIN,
      resource: 'user',
      resourceId: user.id,
      ...(typeof ipAddress === 'string' ? { ipAddress } : {}),
      ...(typeof userAgent === 'string' ? { userAgent } : {}),
    };

    await this.prisma.auditLog.create({
      data: auditData,
    });

    // Generate tokens
    const tokens = await this.generateTokens(user);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role as Role,
      },
      tokens,
    };
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    // Get user ID from refresh token
    const userId = await tokenStore.getUserIdFromRefreshToken(refreshToken);

    if (!userId) {
      throw new UnauthorizedError('Invalid refresh token');
    }

    // Get user
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedError('Invalid refresh token');
    }

    // Delete old refresh token
    await tokenStore.deleteRefreshToken(refreshToken);

    // Generate new tokens
    return this.generateTokens(user);
  }

  async logout(accessToken: string, refreshToken: string, user: RequestUser): Promise<void> {
    // Delete refresh token from Redis
    await tokenStore.deleteRefreshToken(refreshToken);

    // Block access token
    const decoded = this.decodeAccessToken(accessToken);
    if (decoded && decoded.exp) {
      const expiresIn = decoded.exp - Math.floor(Date.now() / 1000);
      if (expiresIn > 0) {
        await tokenStore.blockAccessToken(decoded.jti, expiresIn);
      }
    }

    // Log logout
    await this.prisma.auditLog.create({
      data: {
        userId: user.id,
        action: CONSTANTS.AUDIT_ACTIONS.USER_LOGOUT,
        resource: 'user',
        resourceId: user.id,
      },
    });
  }

  async getProfile(userId: string): Promise<UserProfile> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as Role,
      status: user.status,
      createdAt: user.createdAt,
    };
  }

  private async generateTokens(user: User): Promise<AuthTokens> {
    const jti = randomBytes(16).toString('hex');

    const accessToken = this.jwtSign({
      sub: user.id,
      email: user.email,
      role: user.role,
      jti,
    });

    const refreshToken = await tokenStore.storeRefreshToken(user.id);

    return {
      accessToken,
      refreshToken,
    };
  }

  private decodeAccessToken(token: string): { exp: number; jti: string } | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;

      const payload = JSON.parse(Buffer.from(parts[1]!, 'base64').toString());
      return payload;
    } catch {
      return null;
    }
  }
}
