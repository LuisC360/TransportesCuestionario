import { z } from "zod";

import {
  connectToDatabase,
  disconnectFromDatabase,
} from "../database/connection.js";
import { UsersRepository } from "../modules/users/users.repository.js";
import { UsersService } from "../modules/users/users.service.js";

const superadminSchema = z.object({
  SUPERADMIN_EMAIL: z.email(),
  SUPERADMIN_PASSWORD: z.string().min(12),
});

async function createSuperadmin() {
  const { SUPERADMIN_EMAIL, SUPERADMIN_PASSWORD } = superadminSchema.parse(process.env);
  await connectToDatabase();

  const usersService = new UsersService(new UsersRepository());
  const user = await usersService.createUser({
    email: SUPERADMIN_EMAIL,
    password: SUPERADMIN_PASSWORD,
    role: "superadmin",
  });

  console.log(`Superadmin created: ${user.email}`);
}

createSuperadmin()
  .catch((error: unknown) => {
    console.error("Could not create superadmin", error);
    process.exitCode = 1;
  })
  .finally(disconnectFromDatabase);
