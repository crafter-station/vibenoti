import { apiKey } from "@better-auth/api-key";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { authSchema, db } from "db";
import { upstashSecondaryStorage } from "./upstash-secondary-storage";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: authSchema,
  }),
  secondaryStorage: upstashSecondaryStorage,
  rateLimit: {
    storage: "secondary-storage",
  },
  emailAndPassword: {
    enabled: true,
  },
  plugins: [
    apiKey({
      defaultPrefix: "vibenoti_",
      requireName: true,
      references: "user",
      storage: "secondary-storage",
      fallbackToDatabase: true,
      rateLimit: {
        enabled: false,
      },
      permissions: {
        defaultPermissions: {
          events: ["write"],
        },
      },
    }),
  ],
});
