import { UserModel } from "./users.model.js";

type CreateUserData = {
  email: string;
  passwordHash: string;
  role?: "superadmin" | "user";
};

export class UsersRepository {
  async findByEmail(email: string) {
    return UserModel.findOne({ email: email.toLowerCase().trim() });
  }

  async findByEmailForAuthentication(email: string) {
    return UserModel.findOne({ email: email.toLowerCase().trim() }).select("+passwordHash");
  }

  async findById(id: string) {
    return UserModel.findById(id);
  }

  async findByIdForAuthentication(id: string) {
    return UserModel.findById(id).select("+passwordHash");
  }

  async findAll() {
    return UserModel.find().select("-passwordHash").sort({ createdAt: -1 });
  }

  async create(data: CreateUserData) {
    return UserModel.create(data);
  }

  async updateById(
    id: string,
    data: Partial<Pick<CreateUserData, "email" | "role">> & {
      isActive?: boolean;
      mustChangePassword?: boolean;
      passwordHash?: string;
    },
  ) {
    return UserModel.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    }).select("-passwordHash");
  }

  async deleteById(id: string) {
    return UserModel.findByIdAndDelete(id).select("-passwordHash");
  }
}
