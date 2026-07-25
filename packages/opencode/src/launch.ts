const apiKey = process.env.VIBENOTI_API_KEY;

if (!apiKey) {
  console.error("Missing VIBENOTI_API_KEY in the environment");
  process.exit(1);
}

const opencode = Bun.spawn(["opencode", ...Bun.argv.slice(2)], {
  env: {
    ...process.env,
    VIBENOTI_API_KEY: apiKey,
  },
  stdin: "inherit",
  stdout: "inherit",
  stderr: "inherit",
});

process.exit(await opencode.exited);
