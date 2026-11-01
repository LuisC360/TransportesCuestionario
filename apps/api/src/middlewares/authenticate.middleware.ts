import type { RequestHandler } from "express";
import { getSessionToken, hashSessionToken } from "../modules/auth/session.utils.js";
import { SessionsRepository } from "../modules/auth/sessions.repository.js";
import { UsersRepository } from "../modules/users/users.repository.js";
import { HttpError } from "./http-error.js";

const usersRepository = new UsersRepository();
const sessionsRepository = new SessionsRepository();

export const authenticate: RequestHandler = async (req, _res, next) => {
  const token = getSessionToken(req.headers.cookie);
  if (!token) throw new HttpError(401, "Authentication required");

  const session = await sessionsRepository.findValidByTokenHash(hashSessionToken(token));
  if (!session) throw new HttpError(401, "Session is invalid or expired");

  const user = await usersRepository.findById(session.userId.toString());
  if (!user?.isActive) {
    await sessionsRepository.deleteByTokenHash(hashSessionToken(token));
    throw new HttpError(401, "Account is unavailable");
  }

  req.authenticatedUser = {
    id: user.id,
    email: user.email,
    role: user.role,
    mustChangePassword: user.mustChangePassword,
  };
  req.sessionId = session.id;
  next();
};
