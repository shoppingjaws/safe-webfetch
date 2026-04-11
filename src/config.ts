import JSON5 from "json5";
import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

export interface Rule {
	pattern: string;
}

export interface Template {
	match: string;
	generate: string[];
}

export interface Config {
	rules: string[];
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
	} satisfies Config;
}

export function loadPermission(): Rule[] {
	const path = getPermissionPath();
	if (!existsSync(path)) {
		return [];
	}
	const content = readFileSync(path, "utf-8");
	const parsed = JSON.parse(content) as { rules?: string[] };
	return (parsed.rules ?? []).map((pattern) => ({ pattern }));
}

export function loadAllRules(): Rule[] {
	const config = loadConfig();
	const configRules = config.rules.map((pattern) => ({ pattern }));
	return [...configRules, ...loadPermission()];
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
    // GitHub: allow per org + auto-add raw.githubusercontent.com
    {
      match: "https://github.com/{org}/**",
      generate: [
        "https://github.com/{org}/**",
        "https://raw.githubusercontent.com/{org}/**",
      ],
    },
    // docs.* documentation sites (AWS, Datadog, GCP, etc.)
    {
      match: "https://docs.{domain}/**",
      generate: ["https://docs.{domain}/**"],
    },
    // npm: allow per package
    {
      match: "https://www.npmjs.com/package/{pkg}/**",
      generate: [
        "https://www.npmjs.com/package/{pkg}/**",
        "https://registry.npmjs.org/{pkg}/**",
      ],
    },
    // npm: scoped packages (@org/pkg)
    {
      match: "https://www.npmjs.com/package/@{scope}/{pkg}/**",
      generate: [
        "https://www.npmjs.com/package/@{scope}/{pkg}/**",
        "https://registry.npmjs.org/@{scope}/{pkg}/**",
      ],
    },
    // PyPI: allow per package
    {
      match: "https://pypi.org/project/{pkg}/**",
      generate: ["https://pypi.org/project/{pkg}/**"],
    },
    // crates.io: allow per crate + auto-add docs.rs
    {
      match: "https://crates.io/crates/{crate}/**",
      generate: [
        "https://crates.io/crates/{crate}/**",
        "https://docs.rs/{crate}/**",
      ],
    },
    // pkg.go.dev: allow per module
    {
      match: "https://pkg.go.dev/{module}/**",
      generate: ["https://pkg.go.dev/{module}/**"],
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
