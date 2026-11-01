import { z } from "zod";

export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(12),
  })
  .refine((value) => value.currentPassword !== value.newPassword, {
    message: "New password must differ from current password",
    path: ["newPassword"],
  });

export const resetPasswordSchema = z.object({
  newPassword: z.string().min(12),
});

export const userIdParamSchema = z.object({
  userId: z.string().regex(/^[a-f\d]{24}$/i),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
