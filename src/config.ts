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
	rules: Rule[];
	templates: Template[];
}

export function getConfigDir(): string {
	const xdg = process.env.XDG_CONFIG_HOME;
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
		return { rules: [], templates: [] };
	}
	const content = readFileSync(path, "utf-8");
	const parsed = JSON5.parse(content) as Partial<Config>;
	return {
		rules: parsed.rules ?? [],
		templates: parsed.templates ?? [],
	};
}

export function loadPermission(): Rule[] {
	const path = getPermissionPath();
	if (!existsSync(path)) {
		return [];
	}
	const content = readFileSync(path, "utf-8");
	const parsed = JSON.parse(content) as { rules?: string[] };
	return (parsed.rules ?? []).map((pattern) => ({ pattern, action: "allow" as const }));
}

export function loadAllRules(): Rule[] {
	const config = loadConfig();
	return [...config.rules, ...loadPermission()];
}

export function addPermissionPattern(pattern: string): void {
	const path = getPermissionPath();
	let patterns: string[] = [];
	if (existsSync(path)) {
		const content = readFileSync(path, "utf-8");
		const parsed = JSON.parse(content) as { rules?: string[] };
		patterns = parsed.rules ?? [];
	}
	patterns.push(pattern);
	const dir = getConfigDir();
	mkdirSync(dir, { recursive: true });
	writeFileSync(
		getPermissionPath(),
		JSON.stringify({ rules: patterns }, null, 2),
		"utf-8",
	);
}

const defaultConfig = `{
  templates: [
    // GitHub: org単位で許可 + raw.githubusercontent.com も自動追加
    {
      match: "https://github.com/{org}/**",
      generate: [
        "https://github.com/{org}/**",
        "https://raw.githubusercontent.com/{org}/**",
      ],
    },
    // docs.* 系ドキュメントサイト（AWS, Datadog, GCP 等）
    {
      match: "https://docs.{domain}/**",
      generate: ["https://docs.{domain}/**"],
    },
    // npm: パッケージ単位で許可
    {
      match: "https://www.npmjs.com/package/{pkg}/**",
      generate: [
        "https://www.npmjs.com/package/{pkg}/**",
        "https://registry.npmjs.org/{pkg}/**",
      ],
    },
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
