import argon2 from "argon2";

import { HttpError } from "../../middlewares/http-error.js";
import type { UsersRepository } from "../users/users.repository.js";
import {
  type ChangePasswordInput,
  changePasswordSchema,
  type LoginInput,
  loginSchema,
  type ResetPasswordInput,
  resetPasswordSchema,
} from "./auth.validation.js";
import { createSessionToken, hashSessionToken, SESSION_DURATION_MS } from "./session.utils.js";
import type { SessionsRepository } from "./sessions.repository.js";

export class AuthService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly sessionsRepository: SessionsRepository,
  ) {}

  async login(input: LoginInput) {
    const data = loginSchema.parse(input);
    const user = await this.usersRepository.findByEmailForAuthentication(data.email);

    if (!user?.isActive || !(await argon2.verify(user.passwordHash, data.password))) {
      throw new HttpError(401, "Invalid email or password");
    }

    const token = createSessionToken();
    const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
    await this.sessionsRepository.create({
      userId: user.id,
      tokenHash: hashSessionToken(token),
      expiresAt,
    });

    return {
      token,
      expiresAt,
      user: this.toPublicUser(user),
    };
  }

  async logout(token?: string) {
    if (token) await this.sessionsRepository.deleteByTokenHash(hashSessionToken(token));
  }

  async changePassword(userId: string, sessionId: string | undefined, input: ChangePasswordInput) {
    const data = changePasswordSchema.parse(input);
    const user = await this.usersRepository.findByIdForAuthentication(userId);

    if (!user?.isActive) throw new HttpError(404, "User not found");
    if (!(await argon2.verify(user.passwordHash, data.currentPassword))) {
      throw new HttpError(400, "Current password is incorrect");
    }

    const passwordHash = await this.hashPassword(data.newPassword);
    await this.usersRepository.updateById(userId, {
      passwordHash,
      mustChangePassword: false,
    });
    await this.sessionsRepository.deleteForUserExcept(userId, sessionId);
  }

  async resetPassword(userId: string, input: ResetPasswordInput) {
    const data = resetPasswordSchema.parse(input);
    const user = await this.usersRepository.updateById(userId, {
      passwordHash: await this.hashPassword(data.newPassword),
      mustChangePassword: true,
    });

    if (!user) throw new HttpError(404, "User not found");
    await this.sessionsRepository.deleteForUserExcept(userId);
  }

  private async hashPassword(password: string) {
    return argon2.hash(password, { type: argon2.argon2id });
  }

  private toPublicUser(user: {
    id: string;
    email: string;
    role: "superadmin" | "user";
    mustChangePassword: boolean;
  }) {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
    };
  }
}
