import dotenv from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const apiDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "../../");
dotenv.config({ path: resolve(apiDirectory, "src/.env") });

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  MONGODB_URI: z.string().default("mongodb://127.0.0.1:27017/transportes-cuestionario"),
  WEB_ORIGIN: z.url().default("http://localhost:5173"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

export const env = envSchema.parse(process.env);
