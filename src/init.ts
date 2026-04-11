import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { initConfig } from "./config.ts";

interface ClaudeSettings {
	hooks?: {
		PreToolUse?: Array<{ matcher: string; command: string }>;
		PostToolUse?: Array<{ matcher: string; command: string }>;
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
		settings = JSON.parse(readFileSync(path, "utf-8")) as ClaudeSettings;
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

	const preRegistered = !settings.hooks.PreToolUse.some(
		(h) => h.command === PRE_HOOK_COMMAND,
	);
	if (preRegistered) {
		settings.hooks.PreToolUse.push({
			matcher: "",
			command: PRE_HOOK_COMMAND,
		});
	}

	const postRegistered = !settings.hooks.PostToolUse.some(
		(h) => h.command === POST_HOOK_COMMAND,
	);
	if (postRegistered) {
		settings.hooks.PostToolUse.push({
			matcher: "",
			command: POST_HOOK_COMMAND,
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
