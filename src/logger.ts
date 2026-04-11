import { appendFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { getConfigDir } from "./config.ts";

function getLogPath(): string {
	return join(getConfigDir(), "cc-permission.log");
}

function formatTimestamp(): string {
	return new Date().toISOString();
}

export function log(label: string, data: unknown): void {
	const dir = getConfigDir();
	mkdirSync(dir, { recursive: true });
	const line = `[${formatTimestamp()}] [${label}] ${JSON.stringify(data)}\n`;
	appendFileSync(getLogPath(), line, "utf-8");
}
