import { addRule, loadAllRules, loadConfig } from "./config.ts";
import { matchRule, type HookInput } from "./matcher.ts";
import { learnRules } from "./learn.ts";
import { log } from "./logger.ts";

async function readStdin(): Promise<string> {
	const chunks: Buffer[] = [];
	for await (const chunk of process.stdin) {
		chunks.push(chunk as Buffer);
	}
	return Buffer.concat(chunks).toString("utf-8");
}

export async function runHook(): Promise<void> {
	const raw = await readStdin();
	const input: HookInput = JSON.parse(raw);
	log("hook:input", input);
	const allRules = loadAllRules();
	const result = matchRule(input, allRules);
	log("hook:result", result);
	process.stdout.write(JSON.stringify(result));
}

export async function runPostHook(): Promise<void> {
	const raw = await readStdin();
	const input: HookInput = JSON.parse(raw);
	log("post-hook:input", input);
	const config = loadConfig();
	const allRules = loadAllRules();
	const newRules = learnRules(input, config.templates, allRules);
	for (const rule of newRules) {
		addRule(rule);
		log("post-hook:rule-added", rule);
	}
	process.stdout.write("{}");
}
