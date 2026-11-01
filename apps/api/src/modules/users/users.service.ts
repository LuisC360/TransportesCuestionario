import argon2 from "argon2";

import { UsersRepository } from "./users.repository.js";
import { createUserSchema, type CreateUserInput } from "./users.validation.js";

export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async createUser(input: CreateUserInput) {
    const data = createUserSchema.parse(input);
    const email = data.email.toLowerCase().trim();

    const existingUser = await this.usersRepository.findByEmail(email);

    if (existingUser) {
      throw new Error("User with this email already exists");
    }

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
    return this.usersRepository.findAll();
  }
}
