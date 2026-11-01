import { Router } from "express";

import { UsersRepository } from "./users.repository.js";
import { UsersService } from "./users.service.js";
import { UsersController } from "./users.controller.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { createUserSchema } from "./users.validation.js";

const router = Router();

const repository = new UsersRepository();
const service = new UsersService(repository);
const controller = new UsersController(service);

router.get("/", controller.getUsers);
router.post("/", validate(createUserSchema), controller.createUser);

export default router;
