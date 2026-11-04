import { Router } from "express";

import { UsersRepository } from "./users.repository.js";
import { UsersService } from "./users.service.js";
import { UsersController } from "./users.controller.js";
import { validate, validateParams } from "../../middlewares/validate.middleware.js";
import {
  createUserSchema,
  updateUserEmailSchema,
  userIdParamSchema,
} from "./users.validation.js";

const router = Router();

const repository = new UsersRepository();
const service = new UsersService(repository);
const controller = new UsersController(service);

router.get("/", controller.getUsers);
router.post("/", validate(createUserSchema), controller.createUser);
router.patch("/:userId", validateParams(userIdParamSchema), validate(updateUserEmailSchema), controller.updateEmail);
router.delete("/:userId", validateParams(userIdParamSchema), controller.deleteUser);

export default router;
