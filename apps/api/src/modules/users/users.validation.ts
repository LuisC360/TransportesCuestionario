import { z } from "zod";

export const createUserSchema = z.object({
  email: z.email(),
  password: z.string().min(12),
  role: z.enum(["superadmin", "user"]).default("user"),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
