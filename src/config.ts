import JSON5 from "json5";
import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

export interface Rule {
	pattern: string;
	action: "allow" | "deny";
	reason?: string;
}

export interface Template {
	match: string;
	generate: string[];
}

export interface Config {
	templates: Template[];
}

export function getConfigDir(): string {
	const xdg = process.env["XDG_CONFIG_HOME"];
	const base = xdg || join(homedir(), ".config");
	return join(base, "cc-permission");
}

export function getConfigPath(): string {
	return join(getConfigDir(), "config.json5");
}

export function getPermissionPath(): string {
	return join(getConfigDir(), "permission.json");
}

export function loadConfig(): Config {
	const path = getConfigPath();
	if (!existsSync(path)) {
		return { templates: [] };
	}
	const content = readFileSync(path, "utf-8");
	const parsed = JSON5.parse(content) as Partial<Config>;
	return {
		templates: parsed.templates ?? [],
	};
}

export function loadPermission(): Rule[] {
	const path = getPermissionPath();
	if (!existsSync(path)) {
		return [];
	}
	const content = readFileSync(path, "utf-8");
	const parsed = JSON.parse(content) as { rules?: Rule[] };
	return parsed.rules ?? [];
}

export function loadAllRules(): Rule[] {
	return loadPermission();
}

export function addRule(rule: Rule): { error?: string } {
	try {
		const rules = loadPermission();
		rules.push(rule);
		const dir = getConfigDir();
		mkdirSync(dir, { recursive: true });
		writeFileSync(
			getPermissionPath(),
			JSON.stringify({ rules }, null, 2),
			"utf-8",
		);
		return {};
	} catch (e) {
		return { error: String(e) };
	}
}

const defaultConfig = `{
  templates: [
    // Example:
    // {
    //   match: "https://github.com/{org}/**",
    //   generate: [
    //     "https://github.com/{org}/**",
    //     "https://raw.githubusercontent.com/{org}/**",
    //   ],
    // },
  ],
}
`;

export function initConfig(): {
	created: boolean;
	path: string;
	permissionCreated: boolean;
	permissionPath: string;
} {
	const dir = getConfigDir();
	mkdirSync(dir, { recursive: true });

	const path = getConfigPath();
	const created = !existsSync(path);
	if (created) {
		writeFileSync(path, defaultConfig, "utf-8");
	}

	const permissionPath = getPermissionPath();
	const permissionCreated = !existsSync(permissionPath);
	if (permissionCreated) {
		writeFileSync(permissionPath, JSON.stringify({ rules: [] }, null, 2), "utf-8");
	}

	return { created, path, permissionCreated, permissionPath };
}
