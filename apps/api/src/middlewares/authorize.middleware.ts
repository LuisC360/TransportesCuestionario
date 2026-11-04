import type { RequestHandler } from "express";

import { HttpError } from "./http-error.js";

type UserRole = "superadmin" | "user";

export function authorize(...allowedRoles: UserRole[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.authenticatedUser) {
      throw new HttpError(401, "Authentication required");
    }

    if (!allowedRoles.includes(req.authenticatedUser.role)) {
      throw new HttpError(403, "You do not have permission to perform this action");
    }

    next();
  };
}
