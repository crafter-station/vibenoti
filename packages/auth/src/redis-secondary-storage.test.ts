import { describe, expect, mock, test } from "bun:test";

import { createRedisSecondaryStorage } from "./redis-secondary-storage";

function createClient(value: unknown = null) {
	return {
		get: mock(async () => value),
		set: mock(async () => "OK"),
		del: mock(async () => 1),
	};
}

describe("createRedisSecondaryStorage", () => {
	test("reads values with the configured key prefix", async () => {
		const client = createClient('{"userId":"user-1"}');
		const storage = createRedisSecondaryStorage(client, "test:auth:");

		await expect(storage.get("session-token")).resolves.toBe(
			'{"userId":"user-1"}',
		);
		expect(client.get).toHaveBeenCalledWith("test:auth:session-token");
	});

	test("returns null for missing values", async () => {
		const client = createClient();
		const storage = createRedisSecondaryStorage(client);

		await expect(storage.get("missing")).resolves.toBeNull();
	});

	test("writes values without a TTL", async () => {
		const client = createClient();
		const storage = createRedisSecondaryStorage(client);

		await storage.set("verification", "value");

		expect(client.set).toHaveBeenCalledWith(
			"vibenoti:better-auth:verification",
			"value",
		);
	});

	test("writes values with a TTL in seconds", async () => {
		const client = createClient();
		const storage = createRedisSecondaryStorage(client);

		await storage.set("session", "value", 3600);

		expect(client.set).toHaveBeenCalledWith(
			"vibenoti:better-auth:session",
			"value",
			{ ex: 3600 },
		);
	});

	test("deletes prefixed keys", async () => {
		const client = createClient();
		const storage = createRedisSecondaryStorage(client, "test:auth:");

		await storage.delete("session");

		expect(client.del).toHaveBeenCalledWith("test:auth:session");
	});

	test("propagates storage errors", async () => {
		const error = new Error("Redis unavailable");
		const client = {
			get: mock(async () => {
				throw error;
			}),
			set: mock(async () => "OK"),
			del: mock(async () => 1),
		};
		const storage = createRedisSecondaryStorage(client);

		await expect(storage.get("session")).rejects.toThrow("Redis unavailable");
	});
});
