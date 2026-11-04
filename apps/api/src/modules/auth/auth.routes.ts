import { Router } from "express";

import { authenticate } from "../../middlewares/authenticate.middleware.js";
import { authorize } from "../../middlewares/authorize.middleware.js";
import { validate, validateParams } from "../../middlewares/validate.middleware.js";
import { UsersRepository } from "../users/users.repository.js";
import { AuthController } from "./auth.controller.js";
import { AuthService } from "./auth.service.js";
import {
  changePasswordSchema,
  loginSchema,
  resetPasswordSchema,
  userIdParamSchema,
} from "./auth.validation.js";
import { SessionsRepository } from "./sessions.repository.js";

const router = Router();
const authService = new AuthService(new UsersRepository(), new SessionsRepository());
const controller = new AuthController(authService);

router.post("/login", validate(loginSchema), controller.login);
router.post("/logout", controller.logout);
router.get("/me", authenticate, controller.me);
router.patch("/password", authenticate, validate(changePasswordSchema), controller.changePassword);
router.put(
  "/users/:userId/password",
  authenticate,
  authorize("superadmin"),
  validateParams(userIdParamSchema),
  validate(resetPasswordSchema),
  controller.resetPassword,
);

export default router;
