// backend/drizzle.config.ts
import { defineConfig } from "drizzle-kit";
import { config } from "dotenv";
import { resolve } from "path";

// Charger explicitement le .env depuis le dossier backend
config({ path: resolve(process.cwd(), ".env") });

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not defined in .env file");
}

export default defineConfig({
  schema: "./db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  verbose: true,
});