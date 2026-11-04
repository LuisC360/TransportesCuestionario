import type { Request, Response } from "express";

import { env } from "../../config/env.js";
import type { AuthService } from "./auth.service.js";
import { userIdParamSchema } from "./auth.validation.js";
import { getSessionToken, SESSION_COOKIE_NAME, SESSION_DURATION_MS } from "./session.utils.js";

export class AuthController {
  constructor(private readonly authService: AuthService) {}

  login = async (req: Request, res: Response) => {
    const result = await this.authService.login(req.body);
    res.cookie(SESSION_COOKIE_NAME, result.token, {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_DURATION_MS,
    });

    res.status(200).json({ success: true, data: { user: result.user } });
  };

  logout = async (req: Request, res: Response) => {
    await this.authService.logout(getSessionToken(req.headers.cookie));
    res.clearCookie(SESSION_COOKIE_NAME, {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });
    res.status(200).json({ success: true });
  };

  me = (req: Request, res: Response) => {
    res.status(200).json({ success: true, data: req.authenticatedUser });
  };

  changePassword = async (req: Request, res: Response) => {
    const user = req.authenticatedUser;
    if (!user) return res.status(401).json({ success: false, message: "Authentication required" });

    await this.authService.changePassword(user.id, req.sessionId, req.body);
    res.status(200).json({ success: true, message: "Password changed" });
  };

  resetPassword = async (req: Request, res: Response) => {
    const { userId } = userIdParamSchema.parse(req.params);
    await this.authService.resetPassword(userId, req.body);
    res.status(200).json({ success: true, message: "Password reset; user must change it" });
  };
}
