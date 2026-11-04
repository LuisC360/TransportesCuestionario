import cors from "cors";
import express from "express";

import { env } from "./config/env.js";
import { authenticate } from "./middlewares/authenticate.middleware.js";
import { authorize } from "./middlewares/authorize.middleware.js";
import { errorHandler } from "./middlewares/error.middleware.js";
import { authRoutes } from "./modules/auth/index.js";
import { exportsRoutes } from "./modules/exports/index.js";
import { responsesRoutes } from "./modules/responses/index.js";
import { surveysRoutes } from "./modules/surveys/index.js";
import { usersRoutes } from "./modules/users/index.js";

const app = express();

app.use(cors({ origin: env.WEB_ORIGIN, credentials: true }));
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({
    status: "OK",
    message: "API is running",
  });
});
app.use("/api/auth", authRoutes);
app.use("/api/surveys", surveysRoutes);
app.use("/api/responses", responsesRoutes);
app.use("/api/exports", exportsRoutes);
app.use("/api/users", authenticate, authorize("superadmin"), usersRoutes);

app.use(errorHandler);

export default app;
