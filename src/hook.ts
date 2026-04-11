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
	await log("hook:input", input);
	const allRules = loadAllRules();
	const result = matchRule(input, allRules);
	await log("hook:result", result);
	if (result.decision === "allow") {
		process.stderr.write(
			`[cc-permission] auto-allowed: ${input.tool_name} (${result.matchedPattern})\n`,
		);
	}
	const { matchedPattern: _, ...output } = result;
	process.stdout.write(JSON.stringify(output));
}

export async function runPostHook(): Promise<void> {
	const raw = await readStdin();
	const input: HookInput = JSON.parse(raw);
	await log("post-hook:input", input);
	const config = loadConfig();
	const allRules = loadAllRules();
	const newRules = learnRules(input, config.templates, allRules);
	const messages: string[] = [];
	for (const rule of newRules) {
		addRule(rule);
		await log("post-hook:rule-added", rule);
		messages.push(`[cc-permission] rule added: ${rule.pattern} (${rule.action})`);
	}
	const output: Record<string, string> = {};
	if (messages.length > 0) {
		output.systemMessage = messages.join("\n");
	}
	process.stdout.write(JSON.stringify(output));
}
