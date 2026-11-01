import { createHash, randomBytes } from "node:crypto";

export const SESSION_COOKIE_NAME = "survey_session";
export const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

export function createSessionToken() {
  return randomBytes(32).toString("hex");
}

export function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function getSessionToken(cookieHeader?: string) {
  const cookie = cookieHeader
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${SESSION_COOKIE_NAME}=`));

  if (!cookie) return undefined;

  try {
    return decodeURIComponent(cookie.slice(SESSION_COOKIE_NAME.length + 1));
  } catch {
    return undefined;
  }
}
