import { z } from "zod";

export const createUserSchema = z.object({
  email: z.email().transform((email) => email.toLowerCase().trim()),
  password: z.string().min(12),
  role: z.enum(["superadmin", "user"]).default("user"),
});

export const updateUserEmailSchema = z.object({
  email: z.email().transform((email) => email.toLowerCase().trim()),
});

export const userIdParamSchema = z.object({
  userId: z.string().regex(/^[a-f\d]{24}$/i),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserEmailInput = z.infer<typeof updateUserEmailSchema>;
