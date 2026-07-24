import type { SecondaryStorage } from "better-auth";

type RedisStorageClient = {
	get(key: string): Promise<unknown>;
	set(key: string, value: string, options?: { ex: number }): Promise<unknown>;
	del(key: string): Promise<unknown>;
};

export function createRedisSecondaryStorage(
	client: RedisStorageClient,
	keyPrefix = "vibenoti:better-auth:",
): SecondaryStorage {
	const key = (value: string) => `${keyPrefix}${value}`;

	return {
		get: (value) => client.get(key(value)),
		set: async (name, value, ttl) => {
			if (ttl === undefined) {
				await client.set(key(name), value);
				return;
			}

			await client.set(key(name), value, { ex: ttl });
		},
		delete: async (value) => {
			await client.del(key(value));
		},
	};
}
