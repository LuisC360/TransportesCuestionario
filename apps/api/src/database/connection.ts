import mongoose from "mongoose";

import { env } from "../config/env.js";

export async function connectToDatabase() {
  await mongoose.connect(env.MONGODB_URI);
  console.log("Connected to MongoDB");
}

export async function disconnectFromDatabase() {
  await mongoose.disconnect();
}
