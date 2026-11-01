import "dotenv/config";

import app from "./app.js";
import { connectToDatabase } from "./database/connection.js";
import { env } from "./config/env.js";

async function startServer() {
  await connectToDatabase();

  app.listen(env.PORT, () => {
    console.log(`API running on http://localhost:${env.PORT}`);
  });
}

startServer().catch((error: unknown) => {
  console.error("Failed to start API", error);
  process.exitCode = 1;
});
