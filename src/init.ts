import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { initConfig } from "./config.ts";

interface ClaudeSettings {
	hooks?: {
		PreToolUse?: Array<{ matcher: string; command: string }>;
	};
	[key: string]: unknown;
}

const HOOK_COMMAND = "cc-permission hook";

function getClaudeSettingsPath(): string {
	return join(homedir(), ".claude", "settings.json");
}

function registerHook(): { registered: boolean; path: string } {
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

	const alreadyRegistered = settings.hooks.PreToolUse.some(
		(h) => h.command === HOOK_COMMAND,
	);
	if (alreadyRegistered) {
		return { registered: false, path };
	}

	settings.hooks.PreToolUse.push({ matcher: "", command: HOOK_COMMAND });
	writeFileSync(path, JSON.stringify(settings, null, 2), "utf-8");
	return { registered: true, path };
}

export function runInit(): void {
	const configResult = initConfig();
	if (configResult.created) {
		console.log(`Created config: ${configResult.path}`);
	} else {
		console.log(`Config already exists: ${configResult.path}`);
	}

	const hookResult = registerHook();
	if (hookResult.registered) {
		console.log(`Registered hook in: ${hookResult.path}`);
	} else {
		console.log(`Hook already registered in: ${hookResult.path}`);
	}
}
