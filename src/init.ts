import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import JSON5 from "json5";
import { initConfig } from "./config.ts";

interface HookEntry {
	type: "command";
	command: string;
}

interface HookGroup {
	matcher: string;
	hooks: HookEntry[];
}

interface ClaudeSettings {
	hooks?: {
		PreToolUse?: HookGroup[];
		PostToolUse?: HookGroup[];
	};
	[key: string]: unknown;
}

const PRE_HOOK_COMMAND = "cc-permission hook";
const POST_HOOK_COMMAND = "cc-permission post-hook";

function getClaudeSettingsPath(): string {
	return join(homedir(), ".claude", "settings.json");
}

function registerHooks(): {
	preRegistered: boolean;
	postRegistered: boolean;
	path: string;
} {
	const path = getClaudeSettingsPath();
	let settings: ClaudeSettings = {};
	if (existsSync(path)) {
		settings = JSON5.parse(readFileSync(path, "utf-8")) as ClaudeSettings;
	}

	if (!settings.hooks) {
		settings.hooks = {};
	}
	if (!settings.hooks.PreToolUse) {
		settings.hooks.PreToolUse = [];
	}
	if (!settings.hooks.PostToolUse) {
		settings.hooks.PostToolUse = [];
	}

	const hasPreHook = settings.hooks.PreToolUse.some((g) =>
		g.hooks.some((h) => h.command === PRE_HOOK_COMMAND),
	);
	const preRegistered = !hasPreHook;
	if (preRegistered) {
		settings.hooks.PreToolUse.push({
			matcher: "WebFetch",
			hooks: [{ type: "command", command: PRE_HOOK_COMMAND }],
		});
	}

	const hasPostHook = settings.hooks.PostToolUse.some((g) =>
		g.hooks.some((h) => h.command === POST_HOOK_COMMAND),
	);
	const postRegistered = !hasPostHook;
	if (postRegistered) {
		settings.hooks.PostToolUse.push({
			matcher: "WebFetch",
			hooks: [{ type: "command", command: POST_HOOK_COMMAND }],
		});
	}

	if (preRegistered || postRegistered) {
		writeFileSync(path, JSON.stringify(settings, null, 2), "utf-8");
	}
	return { preRegistered, postRegistered, path };
}

export function runInit(): void {
	const configResult = initConfig();
	if (configResult.created) {
		console.log(`Created config: ${configResult.path}`);
	} else {
		console.log(`Config already exists: ${configResult.path}`);
	}

	const hookResult = registerHooks();
	if (hookResult.preRegistered) {
		console.log(`Registered PreToolUse hook in: ${hookResult.path}`);
	} else {
		console.log(`PreToolUse hook already registered in: ${hookResult.path}`);
	}
	if (hookResult.postRegistered) {
		console.log(`Registered PostToolUse hook in: ${hookResult.path}`);
	} else {
		console.log(`PostToolUse hook already registered in: ${hookResult.path}`);
	}
}
