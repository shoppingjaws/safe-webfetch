import JSON5 from "json5";
import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

export interface Rule {
	tool: string;
	match: {
		field: string;
		pattern: string;
	};
	action: "allow" | "deny";
	reason?: string;
}

export interface Config {
	rules: Rule[];
}

export function getConfigDir(): string {
	const xdg = process.env["XDG_CONFIG_HOME"];
	const base = xdg || join(homedir(), ".config");
	return join(base, "cc-permission");
}

export function getConfigPath(): string {
	return join(getConfigDir(), "config.json5");
}

export function loadConfig(): Config {
	const path = getConfigPath();
	if (!existsSync(path)) {
		return { rules: [] };
	}
	const content = readFileSync(path, "utf-8");
	return JSON5.parse(content) as Config;
}

const defaultConfig = `{
  rules: [
    // Example:
    // {
    //   tool: "WebFetch",
    //   match: {
    //     field: "url",
    //     pattern: "https://github.com/yourname/**",
    //   },
    //   action: "allow",
    // },
  ],
}
`;

export function initConfig(): { created: boolean; path: string } {
	const dir = getConfigDir();
	const path = getConfigPath();
	if (existsSync(path)) {
		return { created: false, path };
	}
	mkdirSync(dir, { recursive: true });
	writeFileSync(path, defaultConfig, "utf-8");
	return { created: true, path };
}
