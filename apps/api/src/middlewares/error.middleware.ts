import type { NextFunction, Request, Response } from "express";

import { HttpError } from "./http-error.js";

export function errorHandler(error: Error, _req: Request, res: Response, _next: NextFunction) {
  const status = error instanceof HttpError ? error.statusCode : 500;
  if (status === 500) console.error(error);

  res.status(status).json({
    success: false,
    message: status === 500 ? "Internal server error" : error.message,
  });
}
