import { existsSync } from "node:fs";
import { getLogPath } from "./logger.ts";

export async function runLogShow(): Promise<void> {
	const lines = parseLines();
	const logPath = getLogPath();

	const paths = [logPath];
	for (let i = 1; i <= 3; i++) {
		paths.push(`${logPath}.${i}`);
	}

	// Collect lines from rotated files (oldest first) then current
	const allLines: string[] = [];
	for (const p of paths.reverse()) {
		if (!existsSync(p)) continue;
		const content = await Bun.file(p).text();
		const fileLines = content.split("\n").filter((l) => l.length > 0);
		allLines.push(...fileLines);
	}

	if (allLines.length === 0) {
		console.log("No log entries found.");
		return;
	}

	const output = lines ? allLines.slice(-lines) : allLines;
	for (const line of output) {
		console.log(line);
	}
}

function parseLines(): number | undefined {
	const args = process.argv.slice(4);
	for (let i = 0; i < args.length; i++) {
		if (args[i] === "-n" || args[i] === "--lines") {
			const val = Number(args[i + 1]);
			if (Number.isFinite(val) && val > 0) return val;
		}
	}
	return undefined;
}
