import type { Request, Response } from "express";

import { UsersService } from "./users.service.js";

export class UsersController {
  constructor(
    private readonly usersService: UsersService,
  ) {}

  createUser = async (req: Request, res: Response) => {
    const user = await this.usersService.createUser(req.body);

    res.status(201).json({
      success: true,
      data: user,
    });
  };

  getUsers = async (_req: Request, res: Response) => {
    const users = await this.usersService.getUsers();

    res.status(200).json({
      success: true,
      data: users,
    });
  };
}
