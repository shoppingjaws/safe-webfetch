import { describe, expect, test, beforeEach } from "bun:test";
import { join } from "node:path";
import { createTestContext, type TestContext } from "./test-helpers.ts";
import { rotateLog } from "./logger.ts";

let ctx: TestContext;

beforeEach(() => {
	ctx = createTestContext();
});

describe("hook (PreToolUse)", () => {
	test("allows matching permission rule", async () => {
		ctx.writeConfig({ templates: [] });
		ctx.writePermission({
			rules: [
				{
					pattern: "https://github.com/shoppingjaws/**",
					action: "allow",
				},
			],
		});

		const { stdout } = await ctx.runHook({
			tool_name: "WebFetch",
			tool_input: {
				url: "https://github.com/shoppingjaws/cc-permission/README.md",
			},
		});

		expect(JSON.parse(stdout)).toEqual({ decision: "allow" });
	});

	test("denies matching permission rule with reason", async () => {
		ctx.writeConfig({ templates: [] });
		ctx.writePermission({
			rules: [
				{
					pattern: "https://evil.example.com/**",
					action: "deny",
					reason: "blocked",
				},
			],
		});

		const { stdout } = await ctx.runHook({
			tool_name: "WebFetch",
			tool_input: { url: "https://evil.example.com/something" },
		});

		expect(JSON.parse(stdout)).toEqual({ decision: "deny", reason: "blocked" });
	});

	test("returns empty for non-matching URL", async () => {
		ctx.writeConfig({ templates: [] });
		ctx.writePermission({
			rules: [
				{
					pattern: "https://github.com/shoppingjaws/**",
					action: "allow",
				},
			],
		});

		const { stdout } = await ctx.runHook({
			tool_name: "WebFetch",
			tool_input: { url: "https://other.com/page" },
		});

		expect(JSON.parse(stdout)).toEqual({});
	});

	test("allows base path without trailing slash for /** pattern", async () => {
		ctx.writeConfig({ templates: [] });
		ctx.writePermission({
			rules: [
				{
					pattern: "https://github.com/shoppingjaws/**",
					action: "allow",
				},
			],
		});

		const { stdout } = await ctx.runHook({
			tool_name: "WebFetch",
			tool_input: { url: "https://github.com/shoppingjaws" },
		});

		expect(JSON.parse(stdout)).toEqual({ decision: "allow" });
	});

	test("allows base path with trailing slash for /** pattern", async () => {
		ctx.writeConfig({ templates: [] });
		ctx.writePermission({
			rules: [
				{
					pattern: "https://github.com/shoppingjaws/**",
					action: "allow",
				},
			],
		});

		const { stdout } = await ctx.runHook({
			tool_name: "WebFetch",
			tool_input: { url: "https://github.com/shoppingjaws/" },
		});

		expect(JSON.parse(stdout)).toEqual({ decision: "allow" });
	});

	test("returns empty when no config exists", async () => {
		const { stdout } = await ctx.runHook({
			tool_name: "WebFetch",
			tool_input: { url: "https://github.com/xxx/yyy" },
		});

		expect(JSON.parse(stdout)).toEqual({});
	});
});

describe("post-hook (PostToolUse)", () => {
	test("generates rules from template and writes to permission.json5", async () => {
		ctx.writeConfig({
			templates: [
				{
					match: "https://github.com/{org}/**",
					generate: [
						"https://github.com/{org}/**",
						"https://raw.githubusercontent.com/{org}/**",
					],
				},
			],
		});

		await ctx.runPostHook({
			tool_name: "WebFetch",
			tool_input: { url: "https://github.com/xxx/yyy/zzz" },
		});

		const permission = ctx.readPermission();
		expect(permission.rules).toEqual([
			{
				pattern: "https://github.com/xxx/**",
				action: "allow",
			},
			{
				pattern: "https://raw.githubusercontent.com/xxx/**",
				action: "allow",
			},
		]);
	});

	test("does not duplicate existing rules", async () => {
		ctx.writeConfig({
			templates: [
				{
					match: "https://github.com/{org}/**",
					generate: ["https://github.com/{org}/**"],
				},
			],
		});
		ctx.writePermission({
			rules: [
				{
					pattern: "https://github.com/xxx/**",
					action: "allow",
				},
			],
		});

		await ctx.runPostHook({
			tool_name: "WebFetch",
			tool_input: { url: "https://github.com/xxx/another-repo" },
		});

		const permission = ctx.readPermission();
		expect(permission.rules).toHaveLength(1);
	});

	test("generates rules from template when URL matches base path without subpath", async () => {
		ctx.writeConfig({
			templates: [
				{
					match: "https://github.com/{org}/**",
					generate: [
						"https://github.com/{org}/**",
						"https://raw.githubusercontent.com/{org}/**",
					],
				},
			],
		});

		await ctx.runPostHook({
			tool_name: "WebFetch",
			tool_input: { url: "https://github.com/anthropics" },
		});

		const permission = ctx.readPermission();
		expect(permission.rules).toEqual([
			{
				pattern: "https://github.com/anthropics/**",
				action: "allow",
			},
			{
				pattern: "https://raw.githubusercontent.com/anthropics/**",
				action: "allow",
			},
		]);
	});

	test("does not generate rules for non-matching template", async () => {
		ctx.writeConfig({
			templates: [
				{
					match: "https://github.com/{org}/**",
					generate: ["https://github.com/{org}/**"],
				},
			],
		});

		const { stdout } = await ctx.runPostHook({
			tool_name: "WebFetch",
			tool_input: { url: "https://gitlab.com/xxx/yyy" },
		});

		expect(JSON.parse(stdout)).toEqual({});
		expect(() => ctx.readPermission()).toThrow();
	});

	test("learned rules are used by subsequent hook calls", async () => {
		ctx.writeConfig({
			templates: [
				{
					match: "https://github.com/{org}/**",
					generate: ["https://github.com/{org}/**"],
				},
			],
		});

		const before = await ctx.runHook({
			tool_name: "WebFetch",
			tool_input: { url: "https://github.com/xxx/yyy" },
		});
		expect(JSON.parse(before.stdout)).toEqual({});

		await ctx.runPostHook({
			tool_name: "WebFetch",
			tool_input: { url: "https://github.com/xxx/yyy" },
		});

		const after = await ctx.runHook({
			tool_name: "WebFetch",
			tool_input: { url: "https://github.com/xxx/another-repo" },
		});
		expect(JSON.parse(after.stdout)).toEqual({ decision: "allow" });
	});
});

describe("log rotation", () => {
	test("rotates current log to .1", async () => {
		const logPath = join(ctx.configDir, "test.log");
		const { mkdir } = await import("node:fs/promises");
		await mkdir(ctx.configDir, { recursive: true });
		await Bun.write(logPath, "original content");

		await rotateLog(logPath);

		expect(await Bun.file(logPath).exists()).toBe(false);
		expect(await Bun.file(`${logPath}.1`).text()).toBe("original content");
	});

	test("shifts existing rotated files", async () => {
		const logPath = join(ctx.configDir, "test.log");
		const { mkdir } = await import("node:fs/promises");
		await mkdir(ctx.configDir, { recursive: true });
		await Bun.write(logPath, "current");
		await Bun.write(`${logPath}.1`, "prev1");
		await Bun.write(`${logPath}.2`, "prev2");

		await rotateLog(logPath);

		expect(await Bun.file(logPath).exists()).toBe(false);
		expect(await Bun.file(`${logPath}.1`).text()).toBe("current");
		expect(await Bun.file(`${logPath}.2`).text()).toBe("prev1");
		expect(await Bun.file(`${logPath}.3`).text()).toBe("prev2");
	});

	test("deletes oldest log file when at max", async () => {
		const logPath = join(ctx.configDir, "test.log");
		const { mkdir } = await import("node:fs/promises");
		await mkdir(ctx.configDir, { recursive: true });
		await Bun.write(logPath, "current");
		await Bun.write(`${logPath}.1`, "prev1");
		await Bun.write(`${logPath}.2`, "prev2");
		await Bun.write(`${logPath}.3`, "prev3");

		await rotateLog(logPath);

		expect(await Bun.file(`${logPath}.1`).text()).toBe("current");
		expect(await Bun.file(`${logPath}.2`).text()).toBe("prev1");
		expect(await Bun.file(`${logPath}.3`).text()).toBe("prev2");
		// prev3 (was .3, the oldest) is deleted
		expect(await Bun.file(`${logPath}.4`).exists()).toBe(false);
	});
});
