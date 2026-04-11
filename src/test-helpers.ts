import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import JSON5 from "json5";

const CLI = join(import.meta.dir, "cli.ts");

export interface TestContext {
	tmpDir: string;
	configDir: string;
	writeConfig: (config: unknown) => void;
	writePermission: (permission: unknown) => void;
	readPermission: () => { rules: unknown[] };
	runHook: (input: unknown) => Promise<{ stdout: string; exitCode: number }>;
	runPostHook: (
		input: unknown,
	) => Promise<{ stdout: string; exitCode: number }>;
}

export function createTestContext(): TestContext {
	const tmpDir = mkdtempSync(join(tmpdir(), "safe-fetch-test-"));
	const configDir = join(tmpDir, "safe-fetch");

	function writeConfig(config: unknown) {
		mkdirSync(configDir, { recursive: true });
		writeFileSync(
			join(configDir, "config.json5"),
			JSON5.stringify(config, null, 2),
			"utf-8",
		);
	}

	function writePermission(permission: unknown) {
		mkdirSync(configDir, { recursive: true });
		writeFileSync(
			join(configDir, "permission.json"),
			JSON.stringify(permission, null, 2),
			"utf-8",
		);
	}

	function readPermission() {
		return JSON.parse(
			readFileSync(join(configDir, "permission.json"), "utf-8"),
		);
	}

	async function runHook(
		input: unknown,
	): Promise<{ stdout: string; exitCode: number }> {
		const proc = Bun.spawn(["bun", "run", CLI, "hook"], {
			stdin: new Blob([JSON.stringify(input)]),
			stdout: "pipe",
			stderr: "pipe",
			env: { ...process.env, XDG_CONFIG_HOME: tmpDir },
		});
		const stdout = await new Response(proc.stdout).text();
		const exitCode = await proc.exited;
		return { stdout, exitCode };
	}

	async function runPostHook(
		input: unknown,
	): Promise<{ stdout: string; exitCode: number }> {
		const proc = Bun.spawn(["bun", "run", CLI, "post-hook"], {
			stdin: new Blob([JSON.stringify(input)]),
			stdout: "pipe",
			stderr: "pipe",
			env: { ...process.env, XDG_CONFIG_HOME: tmpDir },
		});
		const stdout = await new Response(proc.stdout).text();
		const exitCode = await proc.exited;
		return { stdout, exitCode };
	}

	return {
		tmpDir,
		configDir,
		writeConfig,
		writePermission,
		readPermission,
		runHook,
		runPostHook,
	};
}
