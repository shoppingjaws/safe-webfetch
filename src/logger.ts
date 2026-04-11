import { mkdir, rename, unlink } from "node:fs/promises";
import { join } from "node:path";
import { getConfigDir } from "./config.ts";

const MAX_LOG_SIZE = 1 * 1024 * 1024; // 1MB
const MAX_LOG_FILES = 3;

export function getLogPath(): string {
	return join(getConfigDir(), "safe-webfetch.log");
}

function formatTimestamp(): string {
	return new Date().toISOString();
}

export async function rotateLog(logPath: string): Promise<void> {
	// Delete the oldest log file
	const oldest = `${logPath}.${MAX_LOG_FILES}`;
	if (await Bun.file(oldest).exists()) {
		await unlink(oldest);
	}

	// Shift existing rotated files: .2 -> .3, .1 -> .2
	for (let i = MAX_LOG_FILES - 1; i >= 1; i--) {
		const from = `${logPath}.${i}`;
		const to = `${logPath}.${i + 1}`;
		if (await Bun.file(from).exists()) {
			await rename(from, to);
		}
	}

	// Rotate current log to .1
	await rename(logPath, `${logPath}.1`);
}

export async function log(label: string, data: unknown): Promise<void> {
	const dir = getConfigDir();
	await mkdir(dir, { recursive: true });

	const logPath = getLogPath();
	const file = Bun.file(logPath);

	if (file.size >= MAX_LOG_SIZE) {
		await rotateLog(logPath);
	}

	const line = `[${formatTimestamp()}] [${label}] ${JSON.stringify(data)}\n`;
	const existing = (await file.exists()) ? await file.text() : "";
	await Bun.write(logPath, existing + line);
}
