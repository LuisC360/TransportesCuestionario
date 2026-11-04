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

  updateEmail = async (req: Request, res: Response) => {
    const user = await this.usersService.updateEmail(req.params.userId as string, req.body);
    res.status(200).json({ success: true, data: user });
  };

  deleteUser = async (req: Request, res: Response) => {
    const requesterId = req.authenticatedUser?.id;
    if (!requesterId) return res.status(401).json({ success: false, message: "Authentication required" });
    await this.usersService.deleteUser(req.params.userId as string, requesterId);
    res.status(200).json({ success: true });
  };
}
