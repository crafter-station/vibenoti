import { drizzle } from "drizzle-orm/bun-sql";
import * as authSchema from "./auth-schema";

export const db = drizzle(process.env.DATABASE_URL!, { schema: authSchema });
export { authSchema };
