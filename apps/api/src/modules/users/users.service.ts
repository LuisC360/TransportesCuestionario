import argon2 from "argon2";

import { HttpError } from "../../middlewares/http-error.js";
import { SessionsRepository } from "../auth/sessions.repository.js";
import { UsersRepository } from "./users.repository.js";
import {
  createUserSchema,
  type CreateUserInput,
  type UpdateUserEmailInput,
  updateUserEmailSchema,
} from "./users.validation.js";

export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async createUser(input: CreateUserInput) {
    const data = createUserSchema.parse(input);
    const email = data.email.toLowerCase().trim();

    const existingUser = await this.usersRepository.findByEmail(email);

    if (existingUser) throw new HttpError(409, "A user with this email already exists");

    const passwordHash = await argon2.hash(data.password, {
      type: argon2.argon2id,
    });

    const user = await this.usersRepository.create({
      email,
      passwordHash,
      role: data.role,
    });

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      mustChangePassword: user.mustChangePassword,
    };
  }

  async getUsers() {
    const users = await this.usersRepository.findAll();
    return users.map((user) => this.toPublicUser(user));
  }

  async updateEmail(userId: string, input: UpdateUserEmailInput) {
    const { email } = updateUserEmailSchema.parse(input);
    const existingUser = await this.usersRepository.findByEmail(email);
    if (existingUser && existingUser.id !== userId) {
      throw new HttpError(409, "A user with this email already exists");
    }

    const user = await this.usersRepository.updateById(userId, { email });
    if (!user) throw new HttpError(404, "User not found");
    return this.toPublicUser(user);
  }

  async deleteUser(userId: string, requesterId: string) {
    if (userId === requesterId) throw new HttpError(400, "You cannot delete your own account");
    const user = await this.usersRepository.deleteById(userId);
    if (!user) throw new HttpError(404, "User not found");
    await new SessionsRepository().deleteForUserExcept(userId);
  }

  private toPublicUser(user: {
    id: string;
    email: string;
    role: "superadmin" | "user";
    isActive: boolean;
    mustChangePassword: boolean;
    createdAt: Date;
  }) {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      mustChangePassword: user.mustChangePassword,
      createdAt: user.createdAt,
    };
  }
}
