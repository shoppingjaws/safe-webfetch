import { loadConfig } from "./config.ts";
import { matchRule, type HookInput } from "./matcher.ts";

export async function runHook(): Promise<void> {
	const chunks: Buffer[] = [];
	for await (const chunk of process.stdin) {
		chunks.push(chunk as Buffer);
	}
	const raw = Buffer.concat(chunks).toString("utf-8");
	const input: HookInput = JSON.parse(raw);
	const config = loadConfig();
	const result = matchRule(input, config.rules);
	process.stdout.write(JSON.stringify(result));
}
