import { Redis } from "@upstash/redis";

import { createRedisSecondaryStorage } from "./redis-secondary-storage";

const redis = Redis.fromEnv({
	automaticDeserialization: false,
	enableTelemetry: false,
});

export const upstashSecondaryStorage = createRedisSecondaryStorage(
	redis,
	process.env.BETTER_AUTH_REDIS_PREFIX,
);
